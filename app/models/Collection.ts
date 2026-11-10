import i18n from "i18next";
import invariant from "invariant";
import {
  action,
  comparer,
  computed,
  observable,
  override,
  runInAction,
} from "mobx";
import {
  type CollectionPermission,
  type FileOperationFormat,
  type NavigationNode,
  NavigationNodeType,
  type ProsemirrorData,
} from "@shared/types";
import {
  moveNavigationNode,
  sortNavigationNodes,
} from "@shared/utils/collections";
import type CollectionsStore from "~/stores/CollectionsStore";
import type Document from "~/models/Document";
import ParanoidModel from "~/models/base/ParanoidModel";
import { client } from "~/utils/ApiClient";
import type User from "./User";
import Field from "./decorators/Field";
import { AfterChange } from "./decorators/Lifecycle";

export default class Collection extends ParanoidModel {
  static modelName = "Collection";

  constructor(fields: Record<string, unknown>, store: CollectionsStore) {
    super(fields, store);
    this.initialize(fields);
  }

  store: CollectionsStore;

  /** The name of the collection. */
  @Field
  @observable
  name: string;

  /** The reason this collection is archived. */
  @observable
  deprecatedReason: string | null = null;

  /** Collection description in Prosemirror format. */
  @Field
  @observable.shallow
  data: ProsemirrorData;

  /** An icon (or) emoji to use as the collection icon. */
  @Field
  @observable
  icon: string;

  /** The color to use for the collection icon and other highlights. */
  @Field
  @observable
  color?: string | null = undefined;
  /** The default permission for workspace users. */
  @Field
  @observable
  permission?: CollectionPermission = undefined;

  /** The user that owns this collection, if it is a personal collection. */
  @observable
  ownerId: string | null;
  /**
   * Whether public sharing is enabled for the collection. Note this can also be disabled at the
   * workspace level.
   */
  @Field
  @observable
  sharing: boolean;

  /** The sort index for the collection. */
  @Field
  @observable
  index: string;

  /** The sort field and direction for documents in the collection. */
  @Field
  @observable
  sort: {
    field: string;
    direction: "asc" | "desc";
  };

  /** The minimum permission level required to manage templates in this collection. */
  @Field
  @observable
  templateManagement: CollectionPermission;

  /**
   * Whether commenting is enabled for the collection.
   */
  @Field
  @observable
  commenting?: boolean | null = undefined;
  /** The child documents of the collection. */
  @observable
  documents?: NavigationNode[] = undefined;
  /** @deprecated Use path instead. */
  @observable
  url: string;

  /** The ID that appears in the collection slug. */
  @observable
  urlId: string;

  /**
   * The date and time the collection was archived.
   */
  @observable
  archivedAt: string;

  /**
   * User who archived the collection.
   */
  @observable
  archivedBy?: User = undefined;
  @computed
  get searchContent(): string {
    return this.displayName;
  }

  /**
   * The name to show for the collection. A personal collection is always shown
   * with a translated name, whatever name is stored.
   *
   * @returns the name to display.
   */
  @computed
  get displayName(): string {
    return this.isPersonal ? i18n.t("Personal") : this.name;
  }

  /** Returns whether the collection is empty, or undefined if not loaded. */
  @computed
  get isEmpty(): boolean | undefined {
    if (!this.documents) {
      return undefined;
    }

    return (
      this.documents.length === 0 &&
      this.store.rootStore.documents.inCollection(this.id).length === 0
    );
  }

  /**
   * Convenience method to return if a collection is considered private.
   * This means that a membership is required to view it rather than just being
   * a workspace member.
   *
   * @returns boolean
   */
  get isPrivate(): boolean {
    return this.permission === null;
  }

  /**
   * Whether this collection is the personal collection of a user.
   *
   * @returns boolean
   */
  get isPersonal(): boolean {
    return !!this.ownerId;
  }

  @computed
  get isStarred(): boolean {
    return !!this.store.rootStore.stars.orderedData.find(
      (star) => star.collectionId === this.id
    );
  }

  /**
   * Returns whether there is a subscription for this collection in the store.
   *
   * @returns True if there is a subscription, false otherwise.
   */
  @computed
  get isSubscribed(): boolean {
    return !!this.store.rootStore.subscriptions.getByCollectionId(this.id);
  }

  @computed
  get isManualSort(): boolean {
    return this.sort.field === "index";
  }

  @computed({ equals: comparer.structural })
  get sortedDocuments(): NavigationNode[] | undefined {
    if (!this.documents) {
      return undefined;
    }
    return sortNavigationNodes(this.documents, this.sort);
  }

  /**
   * Returns a lookup from document id to child documents.
   *
   * @returns a map of document id to child document nodes.
   */
  @computed({ keepAlive: true })
  get childrenByDocumentId(): Map<string, NavigationNode[]> {
    const childrenByDocumentId = new Map<string, NavigationNode[]>();

    const travelNodes = (nodes: NavigationNode[]) => {
      for (const node of nodes) {
        childrenByDocumentId.set(node.id, node.children);
        travelNodes(node.children);
      }
    };

    if (this.sortedDocuments) {
      travelNodes(this.sortedDocuments);
    }

    return childrenByDocumentId;
  }

  /** The initial letter of the collection name as a string. */
  @computed
  get initial() {
    return (this.displayName?.charAt(0) ?? "?").toUpperCase();
  }

  @computed
  get path() {
    return this.url;
  }

  /**
   * Returns users that have been individually given access to the collection.
   *
   * @returns A list of users that have been given access to the collection.
   */
  @computed
  get members(): User[] {
    return this.store.rootStore.memberships.orderedData
      .filter((m) => m.collectionId === this.id)
      .map((m) => m.user)
      .filter(Boolean);
  }

  @computed
  get isArchived() {
    return !!this.archivedAt;
  }

  @override
  get isDeleted() {
    return !!this.deletedAt;
  }

  @computed
  get isActive() {
    return !this.isArchived && !this.isDeleted;
  }

  @computed
  get hasDocuments() {
    return !!this.documents?.length;
  }

  fetchDocuments = async (options?: { force: boolean }) => {
    if (this.isFetching) {
      return;
    }
    if (this.documents && options?.force !== true) {
      return;
    }

    try {
      this.isFetching = true;
      const res = await client.post("/collections.documents", {
        id: this.id,
      });
      invariant(res?.data, "Data should be available");

      runInAction(() => {
        this.documents = res.data;
      });
    } finally {
      this.isFetching = false;
    }
  };

  /**
   * Updates the document identified by the given id in the collection in memory.
   * Does not update the document in the database.
   *
   * @param document The document properties stored in the collection
   */
  @action
  updateDocument(
    document: Pick<Document, "id" | "title" | "path" | "color" | "icon">
  ) {
    if (!this.documents) {
      return;
    }

    const travelNodes = (nodes: NavigationNode[]) =>
      nodes.forEach((node) => {
        if (node.id === document.id) {
          node.color = document.color ?? undefined;
          node.icon = document.icon ?? undefined;
          node.title = document.title;
          node.url = document.path;
        } else {
          travelNodes(node.children);
        }
      });

    travelNodes(this.documents);
  }

  /**
   * Removes the document identified by the given id from the collection in
   * memory. Does not remove the document from the database.
   *
   * @param documentId The id of the document to remove.
   */
  @action
  removeDocument(documentId: string) {
    if (!this.documents) {
      return;
    }

    this.documents = this.documents.filter(function f(node): boolean {
      if (node.id === documentId) {
        return false;
      }

      if (node.children) {
        node.children = node.children.filter(f);
      }

      return true;
    });
  }

  /**
   * Adds the document identified by the given id to the collection in
   * memory, if it is not already present. Does not add the document to the
   * database or store.
   *
   * @param document The document to add.
   * @param parentDocumentId The id of the document to add the new document to.
   */
  @action
  addDocument(document: Document, parentDocumentId?: string) {
    if (!this.documents || this.childrenByDocumentId.has(document.id)) {
      return;
    }

    if (!parentDocumentId) {
      this.documents.unshift(document.asNavigationNode);
      return;
    }

    const travelNodes = (nodes: NavigationNode[]) =>
      nodes.forEach((node) => {
        if (node.id === parentDocumentId) {
          node.children = [document.asNavigationNode, ...(node.children ?? [])];
        } else {
          travelNodes(node.children);
        }
      });

    travelNodes(this.documents);
  }

  /**
   * Adds a link to an external location to the collection structure.
   *
   * @param attributes The title and url of the link.
   * @param parentDocumentId The id of the document to add the link below, if any.
   * @returns A promise that resolves to the new link node.
   */
  addLink = async (
    attributes: Pick<NavigationNode, "title" | "url">,
    parentDocumentId?: string
  ): Promise<NavigationNode> => {
    const res = await client.post("/collections.add_link", {
      id: this.id,
      parentDocumentId,
      ...attributes,
    });
    invariant(res?.data, "Data should be available");

    runInAction(() => {
      if (!this.documents) {
        return;
      }
      if (!parentDocumentId) {
        this.documents = [...this.documents, res.data];
        return;
      }
      this.documents = this.mapNodes(this.documents, (node) =>
        node.id === parentDocumentId
          ? { ...node, children: [...node.children, res.data] }
          : node
      );
    });

    return res.data;
  };

  /**
   * Updates a link to an external location in the collection structure.
   *
   * @param linkId The id of the link.
   * @param attributes The title and url of the link.
   * @returns A promise that resolves when the link is updated.
   */
  updateLink = async (
    linkId: string,
    attributes: Partial<Pick<NavigationNode, "title" | "url">>
  ): Promise<void> => {
    const res = await client.post("/collections.update_link", {
      id: this.id,
      linkId,
      ...attributes,
    });
    invariant(res?.data, "Data should be available");

    runInAction(() => {
      if (!this.documents) {
        return;
      }
      this.documents = this.mapNodes(this.documents, (node) =>
        node.id === linkId ? { ...res.data, children: node.children } : node
      );
    });
  };

  /**
   * Moves a link to an external location to a new position in the collection
   * structure.
   *
   * @param linkId The id of the link.
   * @param parentDocumentId The id of the new parent document, or undefined for the root.
   * @param index The position among the new siblings, defaults to the end.
   * @returns A promise that resolves when the link is moved.
   */
  moveLink = async (
    linkId: string,
    parentDocumentId: string | undefined,
    index?: number
  ): Promise<void> => {
    await client.post("/collections.move_link", {
      id: this.id,
      linkId,
      parentDocumentId: parentDocumentId ?? null,
      index,
    });

    runInAction(() => {
      if (!this.documents) {
        return;
      }
      const documents = moveNavigationNode(
        this.documents,
        linkId,
        parentDocumentId,
        index
      );
      if (documents) {
        this.documents = documents;
      }
    });
  };

  /**
   * Removes a link to an external location from the collection structure.
   *
   * @param linkId The id of the link.
   * @returns A promise that resolves when the link is removed.
   */
  removeLink = async (linkId: string): Promise<void> => {
    await client.post("/collections.remove_link", {
      id: this.id,
      linkId,
    });

    runInAction(() => {
      this.removeDocument(linkId);
    });
  };

  @action
  updateIndex(index: string) {
    this.index = index;
  }

  getChildrenForDocument(documentId: string) {
    return this.childrenByDocumentId.get(documentId) ?? [];
  }

  @computed
  get asNavigationNode(): NavigationNode {
    return {
      type: NavigationNodeType.Collection,
      id: this.id,
      title: this.name,
      color: this.color ?? undefined,
      icon: this.icon ?? undefined,
      children: this.documents ?? [],
      url: this.url,
    };
  }

  pathToDocument(documentId: string) {
    let path: NavigationNode[] | undefined = [];
    const document = this.store.rootStore.documents.get(documentId);
    if (!document) {
      return path;
    }

    const travelNodes = (
      nodes: NavigationNode[],
      previousPath: NavigationNode[]
    ) => {
      nodes.forEach((node) => {
        const newPath = [...previousPath, node];

        if (node.id === documentId) {
          path = newPath;
          return;
        }

        if (
          document.parentDocumentId &&
          node.id === document.parentDocumentId
        ) {
          path = [...newPath, document.asNavigationNode];
          return;
        }

        return travelNodes(node.children, newPath);
      });
    };

    if (this.documents) {
      travelNodes(this.documents, path);
    }

    return path;
  }

  @action
  star = async (index?: string) => this.store.star(this, index);

  @action
  unstar = async () => this.store.unstar(this);

  /**
   * Subscribes the current user to this collection.
   *
   * @returns A promise that resolves when the subscription is created.
   */
  @action
  subscribe = () => this.store.subscribe(this);

  /**
   * Unsubscribes the current user from this collection.
   *
   * @returns A promise that resolves when the subscription is destroyed.
   */
  @action
  unsubscribe = () => this.store.unsubscribe(this);

  archive = () => this.store.archive(this);

  restore = () => this.store.restore(this);

  /**
   * Duplicates the collection and the published documents within it.
   *
   * @returns A promise that resolves to the duplicated collection.
   */
  duplicate = (options?: { name?: string }) =>
    this.store.duplicate(this, options);

  export = (format: FileOperationFormat, includeAttachments: boolean) =>
    client.post("/collections.export", {
      id: this.id,
      format,
      includeAttachments,
    });

  // hooks

  @AfterChange
  static removePolicies(
    model: Collection,
    previousAttributes: Partial<Collection>
  ) {
    if (
      previousAttributes &&
      (model.sharing !== previousAttributes?.sharing ||
        model.permission !== previousAttributes?.permission)
    ) {
      const { documents, policies } = model.store.rootStore;

      documents.inCollection(model.id).forEach((document) => {
        policies.remove(document.id);
      });
    }
  }

  /**
   * Returns a copy of the given tree with each node replaced by the result of
   * the callback. Children of a replaced node are not visited, and unchanged
   * nodes keep their reference.
   *
   * @param nodes The nodes to map.
   * @param callback Returns the replacement for a node, or the node itself.
   * @returns The mapped nodes.
   */
  private mapNodes(
    nodes: NavigationNode[],
    callback: (node: NavigationNode) => NavigationNode
  ): NavigationNode[] {
    return nodes.map((node) => {
      const result = callback(node);
      if (result !== node) {
        return result;
      }
      const children = this.mapNodes(node.children ?? [], callback);
      return children.every((child, index) => child === node.children[index])
        ? node
        : { ...node, children };
    });
  }

  private isFetching = false;
}
