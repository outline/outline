import { addDays, differenceInDays, differenceInSeconds } from "date-fns";
import i18n, { t } from "i18next";
import { capitalize, floor } from "es-toolkit/compat";
import { action, autorun, comparer, computed, observable, set } from "mobx";
import type {
  JSONObject,
  NavigationNode,
  ProsemirrorData,
} from "@shared/types";
import {
  type ExportContentType,
  FileOperationFormat,
  NavigationNodeType,
  NotificationEventType,
} from "@shared/types";
import Storage from "@shared/utils/Storage";
import { isRTL } from "@shared/utils/rtl";
import slugify from "@shared/utils/slugify";
import type NotesStore from "~/stores/NotesStore";
import User from "~/models/User";
import type { Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import Notebook from "./Notebook";
import type Notification from "./Notification";
import type View from "./View";
import ArchivableModel from "./base/ArchivableModel";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import type { Searchable } from "./interfaces/Searchable";
type SaveOptions = JSONObject & {
  publish?: boolean;
  done?: boolean;
  autosave?: boolean;
};
export default class Note extends ArchivableModel implements Searchable {
  static modelName = "Document";
  constructor(fields: Record<string, unknown>, store: NotesStore) {
    super(fields, store);
    this.embedsDisabled = Storage.get(`embedsDisabled-${this.id}`) ?? false;
    autorun(() => {
      Storage.set(
        `embedsDisabled-${this.id}`,
        this.embedsDisabled ? true : undefined
      );
    });
  }
  @observable
  isSaving = false;
  @observable
  embedsDisabled: boolean;
  @observable
  lastViewedAt: string | undefined;
  store: NotesStore;
  @observable.shallow
  data: ProsemirrorData;
  /**
   * The original data source of the note, if imported.
   */
  sourceMetadata?: {
    /**
     * The type of importer that was used, if any. This can also be empty if an individual file was
     * imported through drag-and-drop, for example.
     */
    importType?: FileOperationFormat;
    /** The date this note was imported. */
    importedAt?: string;
    /** The name of the user the created the original source note. */
    createdByName?: string;
    /** The name of the file this note was imported from. */
    fileName?: string;
  };
  @computed
  get searchContent(): string {
    return this.title;
  }
  @computed
  get searchSuppressed(): boolean {
    return this.isDeleted || this.isArchived;
  }
  /**
   * The name of the original data source, if imported.
   */
  get sourceName() {
    if (!this.sourceMetadata?.importType) {
      return undefined;
    }
    switch (this.sourceMetadata.importType) {
      case FileOperationFormat.MarkdownZip:
        return "Markdown";
      case FileOperationFormat.JSON:
        return "JSON";
      case FileOperationFormat.Notion:
        return "Notion";
      default:
        return capitalize(this.sourceMetadata.importType);
    }
  }
  /**
   * The id of the notebook that this note belongs to, if any.
   */
  @Field("collectionId")
  @observable
  notebookId?: string | null;
  /**
   * The notebook that this note belongs to.
   */
  @Relation(() => Notebook, { onDelete: "cascade" })
  notebook?: Notebook;
  /**
   * The title of the note.
   */
  @Field
  @observable
  title: string;
  /** The likely language of the note, in ISO 639-1 format.  */
  language: string | undefined;
  /**
   * An icon (or) emoji to use as the note icon.
   */
  @Field
  @observable
  icon?: string | null;
  /**
   * The color to use for the note icon.
   */
  @Field
  @observable
  color?: string | null;
  /**
   * Whether the note layout is displayed full page width.
   */
  @Field
  @observable
  fullWidth: boolean;
  /**
   * Whether team members can see who has viewed this note.
   */
  @observable
  insightsEnabled: boolean;
  /**
   * A reference to the template that this note was created from.
   */
  @Field
  @observable
  templateId: string | undefined;
  /**
   * The id of the parent note that this is a child of, if any.
   */
  @Field("parentDocumentId")
  @observable
  parentNoteId: string | undefined;
  /**
   * Parent note that this is a child of, if any.
   */
  @Relation(() => Note, { onArchive: "cascade", onDelete: "cascade" })
  parentNote?: Note;
  /**
   * The ids of users that have edited this note.
   */
  @observable
  collaboratorIds: string[] | undefined;
  @Relation(() => User)
  createdBy: User | undefined;
  @Relation(() => User)
  @observable
  updatedBy: User | undefined;
  @observable
  publishedAt: string | undefined;
  @observable
  popularityScore: number;
  /**
   * @deprecated Use path instead
   */
  @observable
  url: string;
  @observable
  urlId: string;
  @observable
  tasks: {
    completed: number;
    total: number;
  };
  @observable
  revision: number;
  /**
   * Whether this note is contained in a notebook that has been deleted.
   */
  @observable
  isNotebookDeleted: boolean;
  /**
   * Array of backlink note IDs for publicly shared notes.
   * Only populated when viewing through a share link.
   */
  @observable
  backlinkIds?: string[];
  /**
   * Returns the notifications associated with this note.
   */
  @computed
  get notifications(): Notification[] {
    return this.store.rootStore.notifications.filter(
      (notification: Notification) => notification.noteId === this.id
    );
  }
  /**
   * Returns the unread notifications associated with this note.
   */
  @computed
  get unreadNotifications(): Notification[] {
    return this.notifications.filter((notification) => !notification.viewedAt);
  }
  /**
   * Returns the direction of the note text, either "rtl" or "ltr"
   */
  @computed
  get dir(): "rtl" | "ltr" {
    return this.rtl ? "rtl" : "ltr";
  }
  /**
   * Returns true if the note text is right-to-left
   */
  @computed
  get rtl() {
    return isRTL(this.title);
  }
  /**
   * Returns the initial character of the note title in uppercase
   */
  @computed
  get initial(): string {
    return (this.title?.charAt(0) ?? "?").toUpperCase();
  }
  @computed
  get path(): string {
    const prefix = "/doc";
    if (!this.title) {
      return `${prefix}/untitled-${this.urlId}`;
    }
    const slugifiedTitle = slugify(this.title);
    return `${prefix}/${slugifiedTitle}-${this.urlId}`;
  }
  @computed
  get noun(): string {
    return t("note");
  }
  @computed
  get modifiedSinceViewed(): boolean {
    return !!this.lastViewedAt && this.lastViewedAt < this.updatedAt;
  }
  @computed
  get isBadgedNew(): boolean {
    return (
      !this.lastViewedAt &&
      differenceInDays(new Date(), new Date(this.createdAt)) < 14
    );
  }
  @computed
  get isStarred(): boolean {
    return !!this.store.rootStore.stars.orderedData.find(
      (star) => star.noteId === this.id
    );
  }
  @computed
  get collaborators(): User[] {
    return (this.collaboratorIds ?? [])
      .map((id) => this.store.rootStore.users.get(id))
      .filter(Boolean) as User[];
  }
  /**
   * Returns whether there is a subscription for this note in the store.
   * Does not consider remote state.
   *
   * @returns True if there is a subscription, false otherwise.
   */
  @computed
  get isSubscribed(): boolean {
    return !!this.store.rootStore.subscriptions.getByNoteId(this.id);
  }
  /**
   * Returns whether the note is currently publicly shared, taking into account
   * the note's and team's sharing settings.
   *
   * @returns True if the note is publicly shared, false otherwise.
   */
  get isPubliclyShared(): boolean {
    const { shares, auth } = this.store.rootStore;
    const share = shares.getByNoteId(this.id);
    const sharedParent = shares.getByNoteParents(this);
    return !!(
      auth.team?.sharing !== false &&
      this.notebook?.sharing !== false &&
      (share?.published || (sharedParent?.published && !this.isDraft))
    );
  }
  /**
   * Returns the notes that link to this note.
   * For publicly shared notes, uses the backlinkIds provided by the server.
   * For authenticated users, uses the store's backlink data.
   *
   * @returns notes that link to this note.
   */
  @computed
  get backlinks(): Note[] {
    if (this.backlinkIds) {
      return this.backlinkIds
        .map((id) => this.store.get(id))
        .filter(Boolean) as Note[];
    }
    return this.store.getBacklinkedNotes(this.id);
  }
  /**
   * Returns users that have been individually given access to the note.
   *
   * @returns users that have been individually given access to the note
   */
  @computed
  get members(): User[] {
    return this.store.rootStore.userMemberships.orderedData
      .filter((m) => m.noteId === this.id)
      .map((m) => m.user)
      .filter(Boolean);
  }
  @computed
  get isArchived(): boolean {
    return !!this.archivedAt;
  }
  @computed
  get isDeleted(): boolean {
    return !!this.deletedAt;
  }
  @computed
  get isDraft(): boolean {
    return !this.publishedAt;
  }
  get hasEmptyTitle(): boolean {
    return this.title === "";
  }
  @computed
  get permanentlyDeletedAt(): string | undefined {
    if (!this.deletedAt) {
      return undefined;
    }
    return addDays(new Date(this.deletedAt), 30).toString();
  }
  @computed
  get isPersistedOnce(): boolean {
    return this.createdAt === this.updatedAt;
  }
  /**
   * Whether the note was created moments ago, and so cannot yet have views, comments, shares,
   * or backlinks of its own.
   *
   * @returns true if the note was created within the last ten seconds.
   */
  get isJustCreated(): boolean {
    return differenceInSeconds(new Date(), new Date(this.createdAt)) < 10;
  }
  @computed
  get isFromTemplate(): boolean {
    return !!this.templateId;
  }
  @computed
  get isTasks(): boolean {
    return !!this.tasks?.total;
  }
  @computed
  get tasksPercentage(): number {
    if (!this.isTasks) {
      return 0;
    }
    return floor((this.tasks.completed / this.tasks.total) * 100);
  }
  /**
   * Returns the path to the note, using the notebook structure if available.
   * otherwise if we're viewing a shared note we can iterate up the parentNote tree.
   *
   * @returns path to the note
   */
  @computed
  get pathTo() {
    if (this.notebook?.notes) {
      return this.notebook.pathToNote(this.id);
    }
    // find root parent note we have access to
    const path: Note[] = [this];
    while (path[0]?.parentNote) {
      path.unshift(path[0].parentNote);
    }
    return path.map((item) => item.asNavigationNode);
  }
  get titleWithDefault(): string {
    return this.title || i18n.t("Untitled");
  }
  @action
  updateTasks(total: number, completed: number) {
    if (total !== this.tasks.total || completed !== this.tasks.completed) {
      this.tasks = { total, completed };
    }
  }
  archive = () => this.store.archive(this);
  restore = (options?: { revisionId?: string; notebookId?: string }) =>
    this.store.restore(this, options);
  unpublish = (
    options: {
      detach?: boolean;
    } = {
      detach: false,
    }
  ) => this.store.unpublish(this, options);
  @action
  enableEmbeds = () => {
    this.embedsDisabled = false;
  };
  @action
  disableEmbeds = () => {
    this.embedsDisabled = true;
  };
  @action
  pin = (notebookId?: string | null) =>
    this.store.rootStore.pins.create({
      noteId: this.id,
      ...(notebookId ? { notebookId } : {}),
    });
  @action
  unpin = (notebookId?: string) => {
    const pin = this.store.rootStore.pins.orderedData.find(
      (pin) =>
        pin.noteId === this.id &&
        (pin.notebookId === notebookId || (!notebookId && !pin.notebookId))
    );
    return pin?.delete();
  };
  @action
  star = (index?: string) => this.store.star(this, index);
  @action
  unstar = () => this.store.unstar(this);
  /**
   * Subscribes the current user to this note.
   *
   * @returns A promise that resolves when the subscription is created.
   */
  @action
  subscribe = () => this.store.subscribe(this);
  /**
   * Unsubscribes the current user from this note.
   *
   * @returns A promise that resolves when the subscription is destroyed.
   */
  @action
  unsubscribe = () => this.store.unsubscribe(this);
  @action
  view = () => {
    // we don't record views for notes in the trash
    if (this.isDeleted) {
      return;
    }
    // Mark associated unread notifications as read when the note is viewed
    this.store.rootStore.notifications
      .filter(
        (notification: Notification) =>
          !notification.viewedAt &&
          notification.noteId === this.id &&
          [
            NotificationEventType.AddUserToNote,
            NotificationEventType.UpdateNote,
            NotificationEventType.PublishNote,
          ].includes(notification.event)
      )
      .forEach((notification) => notification.markAsRead());
    this.lastViewedAt = new Date().toString();
    return this.store.rootStore.views.create({
      noteId: this.id,
    });
  };
  @action
  updateLastViewed = (view: View) => {
    this.lastViewedAt = view.lastViewedAt;
  };
  @action
  save = async (
    fields?: Properties<typeof this>,
    options?: SaveOptions
  ): Promise<Note> => {
    const params = fields ?? this.toAPI();
    this.isSaving = true;
    try {
      const model = await this.store.save(
        { ...params, ...fields, id: this.id },
        options
      );
      // if saving is successful set the new values on the model itself
      set(this, Object.assign({}, params, model));
      this.persistedAttributes = this.toAPI();
      return model;
    } finally {
      this.isSaving = false;
    }
  };
  move = (options: { notebookId?: string | null; parentNoteId?: string }) =>
    this.store.move({ noteId: this.id, ...options });
  duplicate = (options?: {
    title?: string;
    publish?: boolean;
    recursive?: boolean;
    notebookId?: string | null;
    parentNoteId?: string;
  }) => this.store.duplicate(this, options);
  /**
   * Returns the first blocks of the note, useful for displaying a preview.
   *
   * @param blocks The number of blocks to return, defaults to 4.
   * @returns A new ProseMirror note.
   */
  getSummary = (blocks = 4) => ({
    ...this.data,
    content: this.data.content?.slice(0, blocks),
  });
  @computed
  get pinned(): boolean {
    return !!this.store.rootStore.pins.orderedData.find(
      (pin) => pin.noteId === this.id && pin.notebookId === this.notebookId
    );
  }
  @computed
  get pinnedToHome(): boolean {
    return !!this.store.rootStore.pins.orderedData.find(
      (pin) => pin.noteId === this.id && !pin.notebookId
    );
  }
  @computed
  get isActive(): boolean {
    return !this.isDeleted && !this.isArchived;
  }
  @computed
  get childNotes() {
    return this.store.orderedData.filter(
      (doc) => doc.parentNoteId === this.id && this.isActive === doc.isActive
    );
  }
  @computed({ equals: comparer.structural })
  get asNavigationNode(): NavigationNode {
    return {
      type: NavigationNodeType.Note,
      id: this.id,
      title: this.title,
      color: this.color ?? undefined,
      icon: this.icon ?? undefined,
      children: this.childNotes.map((doc) => doc.asNavigationNode),
      url: this.url,
      isDraft: this.isDraft,
    };
  }
  /**
   * Returns all children of the note.
   * This is determined by the notebook structure, or the user/group memberships in case it's a shared note.
   *
   * @returns An array of NavigationNode objects.
   */
  @computed
  get children(): NavigationNode[] {
    const { userMemberships, groupMemberships } = this.store.rootStore;
    const notebook = this.notebook;
    const membership =
      userMemberships.getByNoteId(this.id) ??
      groupMemberships.getByNoteId(this.id);
    return (
      notebook?.getChildrenForNote(this.id) ??
      membership?.getChildrenForNote(this.id) ??
      []
    );
  }
  download = ({
    contentType,
    includeChildNotes,
  }: {
    contentType: ExportContentType;
    includeChildNotes?: boolean;
  }) =>
    client.post(
      `/documents.export`,
      {
        id: this.id,
        includeChildDocuments: includeChildNotes ?? false,
      },
      {
        ...(includeChildNotes ? {} : { download: true }),
        headers: {
          accept: contentType,
        },
      }
    );
}
