import invariant from "invariant";
import { compact, filter, omitBy, orderBy } from "es-toolkit/compat";
import { observable, action, computed, runInAction } from "mobx";
import type { DirectionFilter, SortFilter } from "@shared/types";
import type { JSONObject } from "@shared/types";
import {
  AttachmentPreset,
  SubscriptionType,
  type DateFilter,
  type StatusFilter,
} from "@shared/types";
import { subtractDate } from "@shared/utils/date";
import { bytesToHumanReadable } from "@shared/utils/files";
import naturalSort from "@shared/utils/naturalSort";
import type RootStore from "~/stores/RootStore";
import Store from "~/stores/base/Store";
import Note from "~/models/Note";
import env from "~/env";
import type { FetchOptions, PaginationParams, SearchResult } from "~/types";
import { client } from "~/utils/ApiClient";
import { extname, uploadFile } from "~/utils/files";
import { petsoClient } from "~/utils/petsoClient";
import type { TNoteDto } from "@treonstudio/petso-lib";
type FetchPageParams = PaginationParams & {
  template?: boolean;
  notebookId?: string;
};
export type SearchParams = {
  query?: string;
  offset?: number;
  limit?: number;
  dateFilter?: DateFilter;
  statusFilter?: StatusFilter[];
  notebookId?: string;
  userId?: string;
  shareId?: string;
  sort?: SortFilter;
  direction?: DirectionFilter;
};
type ImportOptions = {
  publish?: boolean;
};
export default class NotesStore extends Store<Note> {
  @observable
  backlinks: Map<string, string[]> = new Map();
  @observable
  similar: Map<string, string[]> = new Map();
  @observable
  movingNoteId: string | null | undefined;
  importFileTypes: string[] = [
    ".md",
    ".markdown",
    ".doc",
    ".docx",
    ".txt",
    ".htm",
    ".html",
    ".csv",
    ".tsv",
    ".mhtml",
    ".mht",
    ".eml",
    ".textpack",
    ".pdf",
    "text/csv",
    "text/tab-separated-values",
    "text/markdown",
    "text/plain",
    "text/html",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "message/rfc822",
    "multipart/related",
    "application/x-mimearchive",
    "application/pdf",
  ];
  constructor(rootStore: RootStore) {
    super(rootStore, Note);
  }
  private mapPetNote(note: TNoteDto): Note {
    return this.add({
      id: note.id,
      title: note.title,
      data: note.content,
      notebookId: note.collectionId,
      parentNoteId: note.parentNoteId ?? undefined,
      icon: note.icon,
      color: note.color,
      publishedAt: note.publishedAt ?? undefined,
      archivedAt: note.archivedAt ?? undefined,
      deletedAt: note.deletedAt ?? undefined,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      revision: note.revision,
      createdBy: { id: note.createdBy },
      updatedBy: { id: note.createdBy },
      url: `/doc/${note.id}`,
      urlId: note.id,
      tasks: { completed: 0, total: 0 },
      popularityScore: 0,
      fullWidth: false,
      insightsEnabled: false,
      isNotebookDeleted: false,
    });
  }
  private noteInput(params: Properties<Note>) {
    const content = params.data;
    return {
      ...(typeof params.title === "string" ? { title: params.title } : {}),
      ...(content && typeof content === "object" && !Array.isArray(content)
        ? { content: Object.fromEntries(Object.entries(content)) }
        : {}),
      ...(params.notebookId !== undefined
        ? { collectionId: params.notebookId }
        : {}),
      ...(params.parentNoteId !== undefined
        ? { parentNoteId: params.parentNoteId }
        : {}),
      ...(params.icon !== undefined ? { icon: params.icon } : {}),
      ...(params.color !== undefined ? { color: params.color } : {}),
    };
  }
  override async create(
    params: Properties<Note>,
    options?: JSONObject
  ): Promise<Note> {
    const created = await petsoClient.admin.createNote({
      ...this.noteInput(params),
      ...(options?.publish === true ? { publish: true } : {}),
    });
    return this.mapPetNote(created);
  }
  override async update(
    params: Properties<Note>,
    options?: JSONObject
  ): Promise<Note> {
    const updated = await petsoClient.admin.updateNote(params.id, {
      ...this.noteInput(params),
      ...(typeof options?.publish === "boolean"
        ? { publish: options.publish }
        : {}),
    });
    return this.mapPetNote(updated);
  }
  @computed
  get importFileTypesString(): string {
    return this.importFileTypes.join(",");
  }
  @computed
  get all(): Note[] {
    return filter(this.orderedData, (d) => !d.archivedAt && !d.deletedAt);
  }
  @computed
  get recentlyViewed(): Note[] {
    return orderBy(
      this.all.filter((d) => d.lastViewedAt),
      "lastViewedAt",
      "desc"
    );
  }
  @computed
  get recentlyUpdated(): Note[] {
    return orderBy(this.all, "updatedAt", "desc");
  }
  @computed
  get popular(): Note[] {
    return orderBy(this.all, "popularityScore", "desc");
  }
  createdByUser(userId: string): Note[] {
    return orderBy(
      filter(this.all, (d) => d.createdBy?.id === userId),
      "updatedAt",
      "desc"
    );
  }
  inNotebook(notebookId: string): Note[] {
    return filter(this.all, (note) => note.notebookId === notebookId);
  }
  archivedInNotebook(
    notebookId: string,
    options?: {
      archivedAt: string;
    }
  ): Note[] {
    const filterCond = (note: Note) =>
      options
        ? note.notebookId === notebookId &&
          note.isArchived &&
          note.archivedAt === options.archivedAt &&
          !note.isDeleted
        : note.notebookId === notebookId && note.isArchived && !note.isDeleted;
    return filter(this.orderedData, filterCond);
  }
  unarchivedInNotebook(notebookId: string): Note[] {
    return filter(
      this.orderedData,
      (note) =>
        note.notebookId === notebookId && !note.isArchived && !note.isDeleted
    );
  }
  publishedInNotebook(notebookId: string): Note[] {
    return filter(
      this.all,
      (note) => note.notebookId === notebookId && !!note.publishedAt
    );
  }
  rootInNotebook(notebookId: string): Note[] {
    const notebook = this.rootStore.notebooks.get(notebookId);
    if (!notebook || !notebook.sortedNotes) {
      return [];
    }
    const drafts = this.drafts({ notebookId });
    return compact([
      ...drafts,
      ...notebook.sortedNotes.map((node) => this.get(node.id)),
    ]);
  }
  leastRecentlyUpdatedInNotebook(notebookId: string): Note[] {
    return orderBy(this.inNotebook(notebookId), "updatedAt", "asc");
  }
  recentlyUpdatedInNotebook(notebookId: string): Note[] {
    return orderBy(this.inNotebook(notebookId), "updatedAt", "desc");
  }
  recentlyPublishedInNotebook(notebookId: string): Note[] {
    return orderBy(this.publishedInNotebook(notebookId), "publishedAt", "desc");
  }
  alphabeticalInNotebook(notebookId: string): Note[] {
    return naturalSort(this.inNotebook(notebookId), "title");
  }
  popularInNotebook(notebookId: string): Note[] {
    return orderBy(this.inNotebook(notebookId), "popularityScore", "desc");
  }
  /**
   * Evict every note belonging to a notebook from the store, for use when
   * the current user has lost access to the notebook's notes.
   *
   * @param collectionId the ID of the collection to evict notes for.
   */
  @action
  removeInNotebook(notebookId: string) {
    this.orderedData
      .filter((note) => note.notebookId === notebookId)
      .forEach((note) => this.remove(note.id, { permanent: true }));
  }
  get(id: string): Note | undefined {
    return id
      ? (this.data.get(id) ??
          this.orderedData.find((note) => id.endsWith(note.urlId)))
      : undefined;
  }
  @computed
  get archived(): Note[] {
    return orderBy(this.orderedData, "archivedAt", "desc").filter(
      (d) => d.archivedAt && !d.deletedAt
    );
  }
  @computed
  get deleted(): Note[] {
    return orderBy(this.orderedData, "deletedAt", "desc").filter(
      (d) => d.deletedAt
    );
  }
  @computed
  get totalDrafts(): number {
    return this.drafts().length;
  }
  drafts = (
    options: PaginationParams & {
      dateFilter?: DateFilter;
      notebookId?: string;
    } = {}
  ): Note[] => {
    let drafts = filter(
      orderBy(this.all, "updatedAt", "desc"),
      (note) => !note.publishedAt
    );
    if (options.dateFilter) {
      drafts = filter(
        drafts,
        (draft) =>
          new Date(draft.updatedAt) >=
          subtractDate(new Date(), options.dateFilter || "year")
      );
    }
    if (options.notebookId) {
      drafts = filter(drafts, {
        notebookId: options.notebookId,
      });
    }
    return drafts;
  };
  @computed
  get active(): Note | undefined {
    return this.rootStore.ui.activeNoteId
      ? this.data.get(this.rootStore.ui.activeNoteId)
      : undefined;
  }
  @action
  fetchRelationships = async (noteId: string): Promise<void> => {
    const res = await client.post("/relationships.list", {
      documentId: noteId,
    });
    invariant(res?.data, "Relationships not available");
    runInAction("NotesStore#fetchRelationships", () => {
      res.data.documents.forEach(this.add);
      this.addPolicies(res.policies);
      const backlinkIds: string[] = [];
      const similarIds: string[] = [];
      for (const relationship of res.data.relationships) {
        if (relationship.type === "backlink") {
          backlinkIds.push(relationship.reverseNoteId);
        } else if (relationship.type === "similar") {
          similarIds.push(relationship.reverseNoteId);
        }
      }
      this.backlinks.set(noteId, backlinkIds);
      this.similar.set(noteId, similarIds);
    });
  };
  getBacklinkedNotes(noteId: string): Note[] {
    const noteIds = this.backlinks.get(noteId) || [];
    return orderBy(
      compact(noteIds.map((id) => this.data.get(id))),
      "title",
      "asc"
    );
  }
  getSimilarNotes(noteId: string): Note[] {
    const noteIds = this.similar.get(noteId) || [];
    return orderBy(
      compact(noteIds.map((id) => this.data.get(id))),
      "title",
      "asc"
    );
  }
  @action
  fetchChildNotes = async (noteId: string): Promise<void> => {
    const notes = await petsoClient.admin.notes();
    runInAction("NotesStore#fetchChildNotes", () => {
      notes
        .filter((note) => note.parentNoteId === noteId)
        .forEach((note) => this.mapPetNote(note));
    });
  };
  @action
  fetchNamedPage = async (
    request = "list",
    _options: FetchPageParams | undefined
  ): Promise<Note[]> => {
    this.isFetching = true;
    try {
      const notes = await petsoClient.admin.notes(request === "deleted");
      const filtered = notes.filter((note) => {
        if (request === "archived") {
          return note.isArchived && !note.deletedAt;
        }
        if (request === "deleted") {
          return !!note.deletedAt;
        }
        if (request === "drafts") {
          return !note.isPublished && !note.deletedAt;
        }
        if (request === "starred") {
          return false;
        }
        return !note.isArchived && !note.deletedAt;
      });
      runInAction("NotesStore#fetchNamedPage", () => {
        filtered.forEach((note) => this.mapPetNote(note));
        this.isLoaded = true;
      });
      return filtered.map((note) => this.mapPetNote(note));
    } finally {
      this.isFetching = false;
    }
  };
  @action
  fetchArchived = async (options?: PaginationParams): Promise<Note[]> =>
    this.fetchNamedPage("archived", options);
  @action
  fetchDeleted = async (options?: PaginationParams): Promise<Note[]> =>
    this.fetchNamedPage("deleted", options);
  @action
  fetchRecentlyUpdated = async (options?: PaginationParams): Promise<Note[]> =>
    this.fetchNamedPage("list", options);
  @action
  fetchAlphabetical = async (options?: PaginationParams): Promise<Note[]> =>
    this.fetchNamedPage("list", {
      sort: "title",
      direction: "ASC",
      ...options,
    });
  @action
  fetchLeastRecentlyUpdated = async (
    options?: PaginationParams
  ): Promise<Note[]> =>
    this.fetchNamedPage("list", {
      sort: "updatedAt",
      direction: "ASC",
      ...options,
    });
  @action
  fetchRecentlyPublished = async (
    options?: PaginationParams
  ): Promise<Note[]> =>
    this.fetchNamedPage("list", {
      sort: "publishedAt",
      direction: "DESC",
      ...options,
    });
  @action
  fetchRecentlyViewed = async (options?: PaginationParams): Promise<Note[]> =>
    this.fetchNamedPage("viewed", options);
  @action
  fetchPopular = async (options?: PaginationParams): Promise<Note[]> =>
    this.fetchNamedPage("list", {
      sort: "popularityScore",
      direction: "DESC",
      ...options,
    });
  @action
  fetchStarred = (options?: PaginationParams): Promise<Note[]> =>
    this.fetchNamedPage("starred", options);
  @action
  fetchDrafts = (options: PaginationParams = {}): Promise<Note[]> =>
    this.fetchNamedPage("drafts", { limit: 100, ...options });
  @action
  fetchOwned = (options?: PaginationParams): Promise<Note[]> =>
    this.fetchNamedPage("list", options);
  @action
  searchTitles = async (options?: SearchParams): Promise<SearchResult[]> => {
    const compactedOptions = omitBy(options, (o) => !o);
    const res = await client.post("/documents.search_titles", {
      ...compactedOptions,
    });
    invariant(res?.data, "Search response should be available");
    // add the notes and associated policies to the store
    runInAction("NotesStore#searchTitles", () => {
      res.data.forEach(this.add);
      this.addPolicies(res.policies);
    });
    // store a reference to the note model in the search cache instead
    // of the original result from the API.
    const results: SearchResult[] = compact(
      res.data.map((result: SearchResult) => {
        const note = this.data.get(result.id);
        if (!note) {
          return null;
        }
        return {
          id: note.id,
          note: note,
        };
      })
    );
    return results;
  };
  @action
  search = async (options: SearchParams): Promise<SearchResult[]> => {
    const compactedOptions = omitBy(options, (o) => !o);
    const res = await client.post("/documents.search", {
      ...compactedOptions,
    });
    invariant(res?.data, "Search response should be available");
    // add the notes and associated policies to the store
    runInAction("NotesStore#search", () => {
      res.data.forEach((result: SearchResult) => this.add(result.note));
      this.addPolicies(res.policies);
    });
    // store a reference to the note model in the search cache instead
    // of the original result from the API.
    const results: SearchResult[] = compact(
      res.data.map((result: SearchResult) => {
        const note = this.data.get(result.note.id);
        if (!note) {
          return null;
        }
        return {
          id: note.id,
          ranking: result.ranking,
          context: result.context,
          note: note,
        };
      })
    );
    return results;
  };
  @action
  prefetchNote = async (id: string) => {
    if (!this.get(id)) {
      return this.fetch(id, {
        prefetch: true,
      });
    }
    return;
  };
  override fetch = async (id: string, options: FetchOptions = {}) => {
    const existing = this.get(id);
    if (existing && !options.force) {
      return existing;
    }
    return this.mapPetNote(await petsoClient.admin.note(id));
  };
  @action
  move = async ({
    noteId,
    notebookId,
    parentNoteId,
    _index,
  }: {
    noteId: string;
    notebookId?: string | null;
    parentNoteId?: string | null;
    index?: number | null;
  }) => {
    this.movingNoteId = noteId;
    try {
      const moved = await petsoClient.admin.updateNote(noteId, {
        ...(notebookId !== undefined ? { collectionId: notebookId } : {}),
        ...(parentNoteId !== undefined ? { parentNoteId } : {}),
      });
      this.mapPetNote(moved);
      // The websocket "documents.move" event is only broadcast to the
      // notebook channel, so users with note-only access never receive
      // it. Refresh the affected membership tree locally so the sidebar
      // reflects the new structure.
      const membership = this.rootStore.userMemberships.getByNoteId(noteId);
      if (membership) {
        await membership.fetchNotes({ force: true });
      }
    } finally {
      this.movingNoteId = undefined;
    }
  };
  @action
  duplicate = async (
    note: Note,
    options?: {
      title?: string;
      publish?: boolean;
      recursive?: boolean;
      notebookId?: string | null;
      parentNoteId?: string;
    }
  ): Promise<Note[]> => {
    const created = await petsoClient.admin.createNote({
      title: options?.title ?? `${note.title} copy`,
      content: note.data,
      collectionId: options?.notebookId ?? note.notebookId,
      parentNoteId: options?.parentNoteId ?? note.parentNoteId,
      icon: note.icon,
      color: note.color,
      ...(options?.publish !== undefined ? { publish: options.publish } : {}),
    });
    return [this.mapPetNote(created)];
  };
  @action
  import = async (
    file: File,
    parentNoteId: string | null | undefined,
    notebookId: string | null | undefined,
    options: ImportOptions
  ) => {
    // file.type can be an empty string sometimes
    if (
      file.type &&
      !this.importFileTypes.includes(file.type) &&
      !this.importFileTypes.includes(extname(file.name))
    ) {
      throw new Error(`The selected file type is not supported (${file.type})`);
    }
    if (file.size > env.FILE_STORAGE_IMPORT_MAX_SIZE) {
      throw new Error(
        `The selected file was larger than the ${bytesToHumanReadable(env.FILE_STORAGE_IMPORT_MAX_SIZE)} maximum size`
      );
    }
    const attachment = await uploadFile(file, {
      name: file.name,
      preset: AttachmentPreset.Import,
    });
    const res = await client.post(
      "/documents.import",
      {
        attachmentId: attachment.id,
        parentDocumentId: parentNoteId,
        collectionId: notebookId,
        publish: options.publish,
      },
      {
        retry: false,
      }
    );
    invariant(res?.data, "Data should be available");
    this.addPolicies(res.policies);
    return this.add(res.data);
  };
  @action
  async delete(
    note: Note,
    options?: {
      permanent: boolean;
    }
  ) {
    if (note.isNew) {
      this.remove(note.id);
    } else {
      const deleted = await petsoClient.admin.deleteNote(note.id);
      this.mapPetNote(deleted);
    }
    // For permanent deletion, we need to actually remove the note from the
    // local store data Map, as the base Store's remove() method only soft-deletes
    // ParanoidModel instances by setting deletedAt.
    if (options?.permanent) {
      this.data.delete(note.id);
    }
    // check to see if we have any shares related to this note already
    // loaded in local state. If so we can go ahead and remove those too.
    const share = this.rootStore.shares.getByNoteId(note.id);
    if (share) {
      this.rootStore.shares.remove(share.id);
    }
    const notebook = this.getNotebookForNote(note);
    if (notebook) {
      await notebook.refresh();
    }
  }
  @action
  archive = async (note: Note) => {
    const archived = await petsoClient.admin.archiveNote(note.id);
    runInAction("Note#archive", () => {
      this.mapPetNote(archived);
    });
    const notebook = this.getNotebookForNote(note);
    if (notebook) {
      notebook.removeNote(note.id);
    }
  };
  @action
  restore = async (
    note: Note,
    _options: {
      revisionId?: string;
      notebookId?: string;
    } = {}
  ) => {
    const restored = await petsoClient.admin.restoreNote(note.id);
    runInAction("Note#restore", () => {
      this.mapPetNote(restored);
    });
    const notebook = this.getNotebookForNote(note);
    if (notebook) {
      await notebook.refresh();
    }
  };
  @action
  unpublish = async (
    note: Note,
    _options: {
      detach?: boolean;
    } = {
      detach: false,
    }
  ) => {
    const unpublished = await petsoClient.admin.updateNote(note.id, {
      publish: false,
    });
    runInAction("Note#unpublish", () => {
      const notebookId = note.notebookId;
      this.mapPetNote(unpublished);
      if (notebookId) {
        const notebook = this.rootStore.notebooks.get(notebookId);
        notebook?.removeNote(note.id);
      }
    });
  };
  @action
  emptyTrash = async () => {
    await petsoClient.admin.emptyNotesTrash();
    const noteIdsSet = new Set(this.deleted.map((doc) => doc.id));
    // Call removeAll to handle inverse relations, policies, and lifecycle hooks
    this.removeAll((doc: Note) => noteIdsSet.has(doc.id));
    // For permanent deletion (empty trash), we need to hard delete from the store
    // after the cleanup is done, as removeAll only soft-deletes ParanoidModel instances
    noteIdsSet.forEach((id) => this.data.delete(id));
  };
  star = (note: Note, index?: string) =>
    this.rootStore.stars.create({
      noteId: note.id,
      index,
    });
  unstar = (note: Note) => {
    const star = this.rootStore.stars.orderedData.find(
      (s) => s.noteId === note.id
    );
    return star?.delete();
  };
  subscribe = (note: Note) =>
    this.rootStore.subscriptions.create({
      noteId: note.id,
      event: SubscriptionType.Note,
    });
  unsubscribe = (note: Note) => {
    const subscription = this.rootStore.subscriptions.getByNoteId(note.id);
    return subscription?.delete();
  };
  getNotebookForNote(note: Note) {
    return note.notebookId
      ? this.rootStore.notebooks.get(note.notebookId)
      : undefined;
  }
}
