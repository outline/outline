import invariant from "invariant";
import { isEmpty, orderBy, sortBy } from "es-toolkit/compat";
import { action, computed, makeObservable, override, runInAction } from "mobx";
import type { Filter } from "@shared/helpers/FilterHelper";
import {
  CollectionPermission,
  type FileOperationFormat,
  type NavigationNode,
  SubscriptionType,
} from "@shared/types";
import {
  insertNavigationNode,
  moveNavigationNode,
  removeNavigationNode,
  updateNavigationNode,
} from "@shared/utils/collections";
import Collection from "~/models/Collection";
import type { PaginationParams, Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import IndexedStore from "./base/IndexedStore";
import type RootStore from "./RootStore";

export default class CollectionsStore extends IndexedStore<Collection> {
  constructor(rootStore: RootStore) {
    super(rootStore, Collection);
    makeObservable(this);
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

  /** Active collections, other than the personal collection. */
  @computed
  get allActive() {
    return this.orderedData.filter((c) => c.isActive && !c.isPersonal);
  }

  /**
   * Returns the personal collection of the current user, if it was loaded.
   *
   * @returns The personal Collection or undefined
   */
  @computed
  get personal(): Collection | undefined {
    const userId = this.rootStore.auth.user?.id;
    return userId
      ? this.orderedData.find((c) => c.ownerId === userId)
      : undefined;
  }

  @override
  get orderedData(): Collection[] {
    return super.orderedData.filter((collection) => {
      if (collection.deletedAt) {
        return false;
      }

      const can = this.rootStore.policies.abilities(collection.id);
      return isEmpty(can) || can.readDocument;
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
      (collection) => collection.displayName
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
  duplicate = async (
    collection: Collection,
    options?: {
      name?: string;
    }
  ): Promise<Collection> => {
    const res = await client.post("/collections.duplicate", {
      id: collection.id,
      ...options,
    });
    invariant(res?.data, "Data should be available");

    this.addPolicies(res.policies);
    return this.add(res.data);
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
    runInAction(() => {
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
    runInAction(() => {
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

  fetchNamedPage = async (
    request = "list",
    options: (PaginationParams & { filters?: Filter[] }) | undefined
  ): Promise<Collection[]> =>
    this.fetchPaginated(`/collections.${request}`, options);

  @action
  fetchArchived = async (options?: PaginationParams): Promise<Collection[]> =>
    this.fetchNamedPage("list", {
      ...options,
      filters: [{ field: "archivedAt", operator: "isNotNull" }],
    });

  get(id: string = ""): Collection | undefined {
    return this.getByIdOrUrlId(id);
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

  async delete(collection: Collection) {
    await super.delete(collection);
    await this.rootStore.documents.fetchRecentlyUpdated();
    await this.rootStore.documents.fetchRecentlyViewed();
  }

  export = (options: {
    format: FileOperationFormat;
    includeAttachments: boolean;
    includePrivate: boolean;
  }) => client.post("/collections.export_all", options);

  /**
   * Adds a link to the structure of a collection. The collection does not need
   * to be loaded, for example for users with access to a document only.
   *
   * @param collectionId The id of the collection.
   * @param attributes The title and url of the link.
   * @param parentDocumentId The id of the document to add the link below, if any.
   * @param index The position among the siblings, defaults to the end.
   * @returns A promise that resolves to the new link node.
   */
  addLink = async (
    collectionId: string,
    attributes: Pick<NavigationNode, "title" | "url">,
    parentDocumentId?: string,
    index?: number
  ): Promise<NavigationNode> => {
    const res = await client.post("/collections.add_link", {
      id: collectionId,
      parentDocumentId,
      index,
      ...attributes,
    });
    invariant(res?.data, "Data should be available");

    this.changeStructure(collectionId, (nodes, collection) =>
      // The websocket refresh may already contain the link.
      collection.childrenByDocumentId.has(res.data.id)
        ? undefined
        : insertNavigationNode(nodes, res.data, parentDocumentId, index)
    );
    return res.data;
  };

  /**
   * Updates the title and url of a link in the structure of a collection.
   *
   * @param collectionId The id of the collection.
   * @param linkId The id of the link.
   * @param attributes The title and url of the link.
   * @returns A promise that resolves when the link is updated.
   */
  updateLink = async (
    collectionId: string,
    linkId: string,
    attributes: Partial<Pick<NavigationNode, "title" | "url">>
  ): Promise<void> => {
    const res = await client.post("/collections.update_link", {
      id: collectionId,
      linkId,
      ...attributes,
    });
    invariant(res?.data, "Data should be available");

    this.changeStructure(collectionId, (nodes) =>
      updateNavigationNode(nodes, linkId, (node) => ({
        ...res.data,
        children: node.children,
      }))
    );
  };

  /**
   * Moves a link to a new position in the structure of a collection.
   *
   * @param collectionId The id of the collection.
   * @param linkId The id of the link.
   * @param parentDocumentId The id of the new parent document, or undefined for the root.
   * @param index The position among the new siblings, defaults to the end.
   * @returns A promise that resolves when the link is moved.
   */
  moveLink = async (
    collectionId: string,
    linkId: string,
    parentDocumentId: string | undefined,
    index?: number
  ): Promise<void> => {
    await client.post("/collections.move_link", {
      id: collectionId,
      linkId,
      parentDocumentId: parentDocumentId ?? null,
      index,
    });

    this.changeStructure(collectionId, (nodes) =>
      moveNavigationNode(nodes, linkId, parentDocumentId, index)
    );
  };

  /**
   * Removes a link from the structure of a collection.
   *
   * @param collectionId The id of the collection.
   * @param linkId The id of the link.
   * @returns A promise that resolves when the link is removed.
   */
  removeLink = async (collectionId: string, linkId: string): Promise<void> => {
    await client.post("/collections.remove_link", {
      id: collectionId,
      linkId,
    });

    this.changeStructure(
      collectionId,
      (nodes) => removeNavigationNode(nodes, linkId)?.nodes
    );
  };

  /**
   * Reloads the loaded document trees of memberships in a collection, as they
   * do not update with the structure of the collection.
   *
   * @param collectionId The id of the collection.
   */
  refreshMembershipTrees = (collectionId: string) => {
    const { userMemberships, groupMemberships, documents } = this.rootStore;

    [...userMemberships.orderedData, ...groupMemberships.orderedData]
      .filter(
        (membership) =>
          membership.documents &&
          membership.documentId &&
          documents.get(membership.documentId)?.collectionId === collectionId
      )
      .forEach((membership) => void membership.fetchDocuments({ force: true }));
  };

  /**
   * Changes the structure of a collection in memory, when it is loaded, and
   * reloads the membership trees in it.
   *
   * @param collectionId The id of the collection.
   * @param change Returns the new structure, or undefined to keep it.
   */
  @action
  private changeStructure(
    collectionId: string,
    change: (
      nodes: NavigationNode[],
      collection: Collection
    ) => NavigationNode[] | undefined
  ) {
    const collection = this.get(collectionId);
    const documents =
      collection?.documents && change(collection.documents, collection);
    if (collection && documents) {
      collection.documents = documents;
    }
    this.refreshMembershipTrees(collectionId);
  }
}
