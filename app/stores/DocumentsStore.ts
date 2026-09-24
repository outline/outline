import invariant from "invariant";
import { compact, omitBy, orderBy } from "es-toolkit/compat";
import {
  action,
  computed,
  makeObservable,
  observable,
  override,
  runInAction,
} from "mobx";
import { computedFn, now } from "mobx-utils";
import type { DirectionFilter, SortFilter } from "@shared/types";
import {
  AttachmentPreset,
  SubscriptionType,
  type DateFilter,
} from "@shared/types";
import type { Filter } from "@shared/helpers/FilterHelper";
import { subtractDate } from "@shared/utils/date";
import { bytesToHumanReadable } from "@shared/utils/files";
import naturalSort from "@shared/utils/naturalSort";
import type RootStore from "~/stores/RootStore";
import Store from "~/stores/base/Store";
import Document from "~/models/Document";
import env from "~/env";
import type {
  FetchOptions,
  PaginationParams,
  PartialExcept,
  SearchResult,
} from "~/types";
import { client } from "~/utils/ApiClient";
import { extname, uploadFile } from "~/utils/files";

type FetchPageParams = PaginationParams & {
  template?: boolean;
  collectionId?: string;
};

export type SearchParams = {
  query?: string;
  offset?: number;
  limit?: number;
  shareId?: string;
  sort?: SortFilter;
  direction?: DirectionFilter;
  filters?: Filter[];
};

type ImportOptions = {
  publish?: boolean;
};

// Filters are also called outside of reactions, where they run uncached.
const computedFnOptions = { requiresReaction: false };

export default class DocumentsStore extends Store<Document> {
  @observable
  backlinks: Map<string, string[]> = new Map();

  @observable
  similar: Map<string, string[]> = new Map();

  @observable
  movingDocumentId: string | null | undefined = undefined;

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
    super(rootStore, Document);
    makeObservable(this);
  }

  @computed
  get importFileTypesString(): string {
    return this.importFileTypes.join(",");
  }

  @computed
  get all(): Document[] {
    return this.orderedData.filter((d) => !d.archivedAt && !d.deletedAt);
  }

  @computed
  get recentlyViewed(): Document[] {
    return orderBy(
      this.all.filter((d) => d.lastViewedAt),
      "lastViewedAt",
      "desc"
    );
  }

  @computed
  get recentlyUpdated(): Document[] {
    return orderBy(this.all, "updatedAt", "desc");
  }

  @computed
  get popular(): Document[] {
    return orderBy(this.all, "popularityScore", "desc");
  }

  /**
   * Documents created by the given user, most recently updated first.
   *
   * @param userId the ID of the user.
   * @returns the matching documents.
   */
  createdByUser = computedFn(
    (userId: string): Document[] =>
      orderBy(
        this.all.filter((d) => d.createdBy?.id === userId),
        "updatedAt",
        "desc"
      ),
    computedFnOptions
  );

  /**
   * Active documents in the given collection.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  inCollection = computedFn(
    (collectionId: string): Document[] =>
      this.all.filter((document) => document.collectionId === collectionId),
    computedFnOptions
  );

  /**
   * Archived documents in the given collection, optionally narrowed to those
   * archived at a specific time.
   *
   * @param collectionId the ID of the collection.
   * @param options the filters to apply.
   * @returns the matching documents.
   */
  archivedInCollection(
    collectionId: string,
    options?: { archivedAt: string }
  ): Document[] {
    return this.archivedInCollectionAt(collectionId, options?.archivedAt);
  }

  /**
   * Documents in the given collection that are neither archived nor deleted.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  unarchivedInCollection = computedFn(
    (collectionId: string): Document[] =>
      this.orderedData.filter(
        (document) =>
          document.collectionId === collectionId &&
          !document.isArchived &&
          !document.isDeleted
      ),
    computedFnOptions
  );

  /**
   * Published documents in the given collection.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  publishedInCollection = computedFn(
    (collectionId: string): Document[] =>
      this.all.filter(
        (document) =>
          document.collectionId === collectionId && !!document.publishedAt
      ),
    computedFnOptions
  );

  /**
   * Root-level documents in the given collection, drafts first, followed by
   * the published documents in the collection's own order.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  rootInCollection = computedFn((collectionId: string): Document[] => {
    const collection = this.rootStore.collections.get(collectionId);

    if (!collection || !collection.sortedDocuments) {
      return [];
    }

    const drafts = this.draftsFiltered(undefined, collectionId);

    return compact([
      ...drafts,
      ...collection.sortedDocuments.map((node) => this.get(node.id)),
    ]);
  }, computedFnOptions);

  /**
   * Documents in the given collection, least recently updated first.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  leastRecentlyUpdatedInCollection = computedFn(
    (collectionId: string): Document[] =>
      orderBy(this.inCollection(collectionId), "updatedAt", "asc"),
    computedFnOptions
  );

  /**
   * Documents in the given collection, most recently updated first.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  recentlyUpdatedInCollection = computedFn(
    (collectionId: string): Document[] =>
      orderBy(this.inCollection(collectionId), "updatedAt", "desc"),
    computedFnOptions
  );

  /**
   * Documents in the given collection, most recently published first.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  recentlyPublishedInCollection = computedFn(
    (collectionId: string): Document[] =>
      orderBy(this.publishedInCollection(collectionId), "publishedAt", "desc"),
    computedFnOptions
  );

  /**
   * Documents in the given collection, in natural order of title.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  alphabeticalInCollection = computedFn(
    (collectionId: string): Document[] =>
      naturalSort(this.inCollection(collectionId), "title"),
    computedFnOptions
  );

  /**
   * Documents in the given collection, most popular first.
   *
   * @param collectionId the ID of the collection.
   * @returns the matching documents.
   */
  popularInCollection = computedFn(
    (collectionId: string): Document[] =>
      orderBy(this.inCollection(collectionId), "popularityScore", "desc"),
    computedFnOptions
  );

  /**
   * Evict every document belonging to a collection from the store, for use when
   * the current user has lost access to the collection's documents.
   *
   * @param collectionId the ID of the collection to evict documents for.
   */
  @action
  removeInCollection(collectionId: string) {
    this.orderedData
      .filter((document) => document.collectionId === collectionId)
      .forEach((document) => this.remove(document.id, { permanent: true }));
  }

  get(id: string): Document | undefined {
    return id
      ? (this.data.get(id) ??
          this.orderedData.find((doc) => id.endsWith(doc.urlId)))
      : undefined;
  }

  @computed
  get archived(): Document[] {
    return orderBy(this.orderedData, "archivedAt", "desc").filter(
      (d) => d.archivedAt && !d.deletedAt
    );
  }

  /**
   * Documents that are in the trash, optionally narrowed to those deleted by a
   * particular user and/or within a particular time frame.
   *
   * @param options the filters to apply.
   * @returns the matching deleted documents, most recently deleted first.
   */
  deleted(
    options: {
      dateFilter?: DateFilter;
      userId?: string;
    } = {}
  ): Document[] {
    return this.deletedFiltered(options.dateFilter, options.userId);
  }

  @computed
  get totalDrafts(): number {
    return this.drafts().length;
  }

  /**
   * Unpublished documents, optionally narrowed to a collection and/or a time
   * frame.
   *
   * @param options the filters to apply.
   * @returns the matching drafts, most recently updated first.
   */
  drafts(
    options: PaginationParams & {
      dateFilter?: DateFilter;
      collectionId?: string;
    } = {}
  ): Document[] {
    return this.draftsFiltered(options.dateFilter, options.collectionId);
  }

  @computed
  get active(): Document | undefined {
    return this.rootStore.ui.activeDocumentId
      ? this.data.get(this.rootStore.ui.activeDocumentId)
      : undefined;
  }

  @action
  fetchRelationships = async (documentId: string): Promise<void> => {
    const res = await client.post("/relationships.list", { documentId });
    invariant(res?.data, "Relationships not available");

    runInAction(() => {
      res.data.documents.forEach(this.add);
      this.addPolicies(res.policies);

      const backlinkIds: string[] = [];
      const similarIds: string[] = [];

      for (const relationship of res.data.relationships) {
        if (relationship.type === "backlink") {
          backlinkIds.push(relationship.reverseDocumentId);
        } else if (relationship.type === "similar") {
          similarIds.push(relationship.reverseDocumentId);
        }
      }

      this.backlinks.set(documentId, backlinkIds);
      this.similar.set(documentId, similarIds);
    });
  };

  getBacklinkedDocuments(documentId: string): Document[] {
    const documentIds = this.backlinks.get(documentId) || [];
    return orderBy(
      compact(documentIds.map((id) => this.data.get(id))),
      "title",
      "asc"
    );
  }

  getSimilarDocuments(documentId: string): Document[] {
    const documentIds = this.similar.get(documentId) || [];
    return orderBy(
      compact(documentIds.map((id) => this.data.get(id))),
      "title",
      "asc"
    );
  }

  @action
  fetchChildDocuments = async (documentId: string): Promise<void> => {
    const res = await client.post(`/documents.list`, {
      parentDocumentId: documentId,
    });
    invariant(res?.data, "Document list not available");

    runInAction(() => {
      res.data.forEach(this.add);
      this.addPolicies(res.policies);
    });
  };

  fetchNamedPage = async (
    request = "list",
    options: FetchPageParams | undefined
  ): Promise<Document[]> =>
    this.fetchPaginated(`/documents.${request}`, options);

  @action
  fetchArchived = async (options?: PaginationParams): Promise<Document[]> =>
    this.fetchNamedPage("archived", options);

  @action
  fetchDeleted = async (
    options?: PaginationParams & { filters?: Filter[] }
  ): Promise<Document[]> => this.fetchNamedPage("deleted", options);

  @action
  fetchRecentlyUpdated = async (
    options?: PaginationParams
  ): Promise<Document[]> => this.fetchNamedPage("list", options);

  @action
  fetchAlphabetical = async (options?: PaginationParams): Promise<Document[]> =>
    this.fetchNamedPage("list", {
      sort: "title",
      direction: "ASC",
      ...options,
    });

  @action
  fetchLeastRecentlyUpdated = async (
    options?: PaginationParams
  ): Promise<Document[]> =>
    this.fetchNamedPage("list", {
      sort: "updatedAt",
      direction: "ASC",
      ...options,
    });

  @action
  fetchRecentlyPublished = async (
    options?: PaginationParams
  ): Promise<Document[]> =>
    this.fetchNamedPage("list", {
      sort: "publishedAt",
      direction: "DESC",
      ...options,
    });

  @action
  fetchRecentlyViewed = async (
    options?: PaginationParams
  ): Promise<Document[]> => this.fetchNamedPage("viewed", options);

  @action
  fetchPopular = async (options?: PaginationParams): Promise<Document[]> =>
    this.fetchNamedPage("list", {
      sort: "popularityScore",
      direction: "DESC",
      ...options,
    });

  @action
  fetchStarred = (options?: PaginationParams): Promise<Document[]> =>
    this.fetchNamedPage("starred", options);

  @action
  fetchDrafts = (options: PaginationParams = {}): Promise<Document[]> =>
    this.fetchNamedPage("drafts", { limit: 100, ...options });

  @action
  fetchOwned = (options?: PaginationParams): Promise<Document[]> =>
    this.fetchNamedPage("list", options);

  @action
  searchTitles = async (options?: SearchParams): Promise<SearchResult[]> => {
    const compactedOptions = omitBy(options, (o) => !o);
    const res = await client.post("/documents.search_titles", {
      ...compactedOptions,
    });
    invariant(res?.data, "Search response should be available");

    // add the documents and associated policies to the store
    runInAction(() => {
      res.data.forEach(this.add);
      this.addPolicies(res.policies);
    });

    // store a reference to the document model in the search cache instead
    // of the original result from the API.
    const results: SearchResult[] = compact(
      res.data.map((result: SearchResult) => {
        const document = this.data.get(result.id);
        if (!document) {
          return null;
        }
        return {
          id: document.id,
          document,
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

    // add the documents and associated policies to the store
    runInAction(() => {
      res.data.forEach((result: SearchResult) => this.add(result.document));
      this.addPolicies(res.policies);
    });

    // store a reference to the document model in the search cache instead
    // of the original result from the API.
    const results: SearchResult[] = compact(
      res.data.map((result: SearchResult) => {
        const document = this.data.get(result.document.id);
        if (!document) {
          return null;
        }
        return {
          id: document.id,
          ranking: result.ranking,
          context: result.context,
          document,
        };
      })
    );
    return results;
  };

  @action
  prefetchDocument = async (id: string) => {
    if (!this.get(id)) {
      return this.fetch(id, {
        prefetch: true,
      });
    }

    return;
  };

  override fetch = (id: string, options: FetchOptions = {}) =>
    super.fetch(
      id,
      options,
      (res: { data: { document: PartialExcept<Document, "id"> } }) =>
        res.data.document
    );

  @action
  move = async ({
    documentId,
    collectionId,
    parentDocumentId,
    index,
  }: {
    documentId: string;
    collectionId?: string | null;
    parentDocumentId?: string | null;
    index?: number | null;
  }) => {
    this.movingDocumentId = documentId;

    try {
      const res = await client.post("/documents.move", {
        id: documentId,
        collectionId,
        parentDocumentId,
        index,
      });
      invariant(res?.data, "Data not available");
      res.data.documents.forEach(this.add);
      this.addPolicies(res.policies);

      // The websocket "documents.move" event is only broadcast to the
      // collection channel, so users with document-only access never receive
      // it. Refresh the affected membership tree locally so the sidebar
      // reflects the new structure.
      const membership =
        this.rootStore.userMemberships.getByDocumentId(documentId);
      if (membership) {
        await membership.fetchDocuments({ force: true });
      }
    } finally {
      this.movingDocumentId = undefined;
    }
  };

  @action
  duplicate = async (
    document: Document,
    options?: {
      title?: string;
      publish?: boolean;
      recursive?: boolean;
    }
  ): Promise<Document[]> => {
    const res = await client.post("/documents.duplicate", {
      id: document.id,
      ...options,
    });
    invariant(res?.data, "Data should be available");

    this.addPolicies(res.policies);
    return res.data.documents.map(this.add);
  };

  @action
  import = async (
    file: File,
    parentDocumentId: string | null | undefined,
    collectionId: string | null | undefined,
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
        `The selected file was larger than the ${bytesToHumanReadable(
          env.FILE_STORAGE_IMPORT_MAX_SIZE
        )} maximum size`
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
        parentDocumentId,
        collectionId,
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

  @override
  async delete(
    document: Document,
    options?: {
      permanent: boolean;
    }
  ) {
    await super.delete(document, options);

    // For permanent deletion, we need to actually remove the document from the
    // local store data Map, as the base Store's remove() method only soft-deletes
    // ParanoidModel instances by setting deletedAt.
    if (options?.permanent) {
      this.data.delete(document.id);
    } else {
      // remove() only stamps deletedAt, so mirror the server in recording the
      // acting user against the document and its descendants. The trash relies
      // on this to filter by who deleted an item before the next fetch.
      const user = this.rootStore.auth.user ?? undefined;
      const setDeletedBy = (doc: Document) => {
        doc.deletedBy = user;
        doc.childDocuments.forEach(setDeletedBy);
      };
      setDeletedBy(document);
    }

    // check to see if we have any shares related to this document already
    // loaded in local state. If so we can go ahead and remove those too.
    const share = this.rootStore.shares.getByDocumentId(document.id);

    if (share) {
      this.rootStore.shares.remove(share.id);
    }

    const collection = this.getCollectionForDocument(document);
    if (collection) {
      await collection.refresh();
    }
  }

  /**
   * Archives a document and updates its local state.
   *
   * @param document the document to archive.
   * @param options the archive options.
   * @returns a promise that resolves when local state is updated.
   */
  @action
  archive = async (document: Document, options: { reason?: string } = {}) => {
    const res = await client.post("/documents.archive", {
      id: document.id,
      reason: options.reason,
    });
    runInAction(() => {
      invariant(res?.data, "Data should be available");
      document.updateData(res.data);
      this.addPolicies(res.policies);
    });
    const collection = this.getCollectionForDocument(document);
    if (collection) {
      collection.removeDocument(document.id);
    }
  };

  @action
  restore = async (
    document: Document,
    options: {
      revisionId?: string;
      collectionId?: string;
    } = {}
  ) => {
    const res = await client.post("/documents.restore", {
      id: document.id,
      revisionId: options.revisionId,
      collectionId: options.collectionId,
    });
    runInAction(() => {
      invariant(res?.data, "Data should be available");
      document.updateData(res.data);
      this.addPolicies(res.policies);
    });
    const collection = this.getCollectionForDocument(document);
    if (collection) {
      await collection.refresh();
    }
  };

  @action
  unpublish = async (
    document: Document,
    options: { detach?: boolean } = {
      detach: false,
    }
  ) => {
    const res = await client.post("/documents.unpublish", {
      id: document.id,
      ...options,
    });

    runInAction(() => {
      invariant(res?.data, "Data should be available");
      // unpublishing could sometimes detach the document from the collection.
      // so, get the collection id before data is updated.
      const collectionId = document.collectionId;

      document.updateData(res.data);
      this.addPolicies(res.policies);

      if (collectionId) {
        const collection = this.rootStore.collections.get(collectionId);
        collection?.removeDocument(document.id);
      }
    });
  };

  @action
  emptyTrash = async () => {
    await client.post("/documents.empty_trash");

    const documentIdsSet = new Set(this.deleted().map((doc) => doc.id));
    // Call removeAll to handle inverse relations, policies, and lifecycle hooks
    this.removeAll((doc: Document) => documentIdsSet.has(doc.id));
    // For permanent deletion (empty trash), we need to hard delete from the store
    // after the cleanup is done, as removeAll only soft-deletes ParanoidModel instances
    documentIdsSet.forEach((id) => this.data.delete(id));
  };

  star = (document: Document, index?: string) =>
    this.rootStore.stars.create({
      documentId: document.id,
      index,
    });

  unstar = (document: Document) => {
    const star = this.rootStore.stars.orderedData.find(
      (s) => s.documentId === document.id
    );
    return star?.delete();
  };

  subscribe = (document: Document) =>
    this.rootStore.subscriptions.create({
      documentId: document.id,
      event: SubscriptionType.Document,
    });

  unsubscribe = (document: Document) => {
    const subscription = this.rootStore.subscriptions.getByDocumentId(
      document.id
    );

    return subscription?.delete();
  };

  getCollectionForDocument(document: Document) {
    return document.collectionId
      ? this.rootStore.collections.get(document.collectionId)
      : undefined;
  }

  private archivedInCollectionAt = computedFn(
    (collectionId: string, archivedAt: string | undefined): Document[] =>
      this.orderedData.filter(
        (document) =>
          document.collectionId === collectionId &&
          document.isArchived &&
          !document.isDeleted &&
          (archivedAt === undefined || document.archivedAt === archivedAt)
      ),
    computedFnOptions
  );

  private deletedFiltered = computedFn(
    (
      dateFilter: DateFilter | undefined,
      userId: string | undefined
    ): Document[] => {
      let deleted = orderBy(this.orderedData, "deletedAt", "desc").filter(
        (d) => d.deletedAt
      );

      if (userId) {
        deleted = deleted.filter(
          (document) => document.deletedBy?.id === userId
        );
      }

      if (dateFilter) {
        const cutoff = subtractDate(new Date(now(60000)), dateFilter);
        deleted = deleted.filter(
          (document) =>
            !!document.deletedAt && new Date(document.deletedAt) >= cutoff
        );
      }

      return deleted;
    },
    computedFnOptions
  );

  private draftsFiltered = computedFn(
    (
      dateFilter: DateFilter | undefined,
      collectionId: string | undefined
    ): Document[] => {
      let drafts = orderBy(this.all, "updatedAt", "desc").filter(
        (doc) => !doc.publishedAt
      );

      if (dateFilter) {
        const cutoff = subtractDate(new Date(now(60000)), dateFilter);
        drafts = drafts.filter((draft) => new Date(draft.updatedAt) >= cutoff);
      }

      if (collectionId) {
        drafts = drafts.filter((draft) => draft.collectionId === collectionId);
      }

      return drafts;
    },
    computedFnOptions
  );
}
