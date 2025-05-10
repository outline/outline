import invariant from "invariant";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import orderBy from "lodash/orderBy";
import sortBy from "lodash/sortBy";
import { computed, action, runInAction } from "mobx";
import {
  CollectionPermission,
  CollectionStatusFilter,
  FileOperationFormat,
  SubscriptionType,
} from "@shared/types";
import Collection from "~/models/Collection";
import { PaginationParams, Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class CollectionsStore extends Store<Collection> {
  constructor(rootStore: RootStore) {
    super(rootStore, Collection);
  }

  /**
   * Returns the currently active collection, or undefined if not in the context of a collection.
   *
   * @returns The active Collection or undefined
   */
  @computed
  get active(): Collection | undefined {
    return this.rootStore.ui.activeCollectionId
      ? this.data.get(this.rootStore.ui.activeCollectionId)
      : undefined;
  }

  @computed
  get allActive() {
    return this.orderedData.filter((c) => c.isActive);
  }

  @computed
  get orderedData(): Collection[] {
    let collections = Array.from(this.data.values());
    collections = collections
      .filter((collection) => !collection.deletedAt)
      .filter((collection) => {
        const can = this.rootStore.policies.abilities(collection.id);
        return isEmpty(can) || can.readDocument;
      });
    return collections.sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }

      return a.index < b.index ? -1 : 1;
    });
  }

  /**
   * Returns all collections that are require explicit permission to access.
   */
  @computed
  get private(): Collection[] {
    return this.all.filter((collection) => collection.isPrivate);
  }

  /**
   * Returns all collections that are accessible by default.
   */
  @computed
  get nonPrivate(): Collection[] {
    return this.all.filter(
      (collection) => collection.isActive && !collection.isPrivate
    );
  }

  /**
   * Returns all collections that are accessible to the current user.
   */
  @computed
  get all(): Collection[] {
    return sortBy(
      Array.from(this.data.values()),
      (collection) => collection.name
    );
  }

  @action
  import = async (
    attachmentId: string,
    options: { format?: string; permission?: CollectionPermission | null }
  ) => {
    await client.post("/collections.import", {
      attachmentId,
      ...options,
    });
  };

  @action
  move = async (collectionId: string, index: string) => {
    const res = await client.post("/collections.move", {
      id: collectionId,
      index,
    });
    invariant(res?.success, "Collection could not be moved");
    const collection = this.get(collectionId);

    if (collection) {
      collection.updateIndex(res.data.index);
    }
  };

  @action
  archive = async (collection: Collection) => {
    const res = await client.post("/collections.archive", {
      id: collection.id,
    });
    runInAction("Collection#archive", () => {
      invariant(res?.data, "Data should be available");
      this.add(res.data);
      this.addPolicies(res.policies);
    });
  };

  @action
  restore = async (collection: Collection) => {
    const res = await client.post("/collections.restore", {
      id: collection.id,
    });
    runInAction("Collection#restore", () => {
      invariant(res?.data, "Data should be available");
      this.add(res.data);
      this.addPolicies(res.policies);
    });
  };

  async update(params: Properties<Collection>): Promise<Collection> {
    const result = await super.update(params);

    // If we're changing sharing permissions on the collection then we need to
    // remove all locally cached policies for documents in the collection as they
    // are now invalid
    if (params.sharing !== undefined) {
      this.rootStore.documents.inCollection(result.id).forEach((document) => {
        this.rootStore.policies.remove(document.id);
      });
    }

    return result;
  }

  @action
  async fetch(id: string, options?: { force: boolean }): Promise<Collection> {
    const model = await super.fetch(id, options);
    await model.fetchDocuments(options);
    return model;
  }

  @action
  fetchNamedPage = async (
    request = "list",
    options:
      | (PaginationParams & { statusFilter: CollectionStatusFilter[] })
      | undefined
  ): Promise<Collection[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.${request}`, options);
      invariant(res?.data, "Collection list not available");
      runInAction("CollectionsStore#fetchNamedPage", () => {
        res.data.forEach(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
      });
      return res.data;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchArchived = async (options?: PaginationParams): Promise<Collection[]> =>
    this.fetchNamedPage("list", {
      ...options,
      statusFilter: [CollectionStatusFilter.Archived],
    });

  get(id: string): Collection | undefined {
    return (
      this.data.get(id) ??
      this.orderedData.find((collection) => id.endsWith(collection.urlId))
    );
  }

  @computed
  get archived(): Collection[] {
    return orderBy(this.orderedData, "archivedAt", "desc").filter(
      (c) => c.isArchived && !c.isDeleted
    );
  }

  @computed
  get publicCollections() {
    return this.orderedData.filter(
      (collection) =>
        collection.permission &&
        Object.values(CollectionPermission).includes(collection.permission)
    );
  }

  star = async (collection: Collection, index?: string) => {
    await this.rootStore.stars.create({
      collectionId: collection.id,
      index,
    });
  };

  unstar = async (collection: Collection) => {
    const star = this.rootStore.stars.orderedData.find(
      (s) => s.collectionId === collection.id
    );
    await star?.delete();
  };

  subscribe = (collection: Collection) =>
    this.rootStore.subscriptions.create({
      collectionId: collection.id,
      event: SubscriptionType.Document,
    });

  unsubscribe = (collection: Collection) => {
    const subscription = this.rootStore.subscriptions.getByCollectionId(
      collection.id
    );

    return subscription?.delete();
  };

  @computed
  get navigationNodes() {
    return this.orderedData.map((collection) => collection.asNavigationNode);
  }

  getByUrl(url: string): Collection | null | undefined {
    return find(this.orderedData, (col: Collection) => url.endsWith(col.urlId));
  }

  async delete(collection: Collection) {
    await super.delete(collection);
    await this.rootStore.documents.fetchRecentlyUpdated();
    await this.rootStore.documents.fetchRecentlyViewed();
  }

  export = (format: FileOperationFormat, includeAttachments: boolean) =>
    client.post("/collections.export_all", {
      format,
      includeAttachments,
    });
}
