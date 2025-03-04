import invariant from "invariant";
import { action, computed, observable, runInAction } from "mobx";
import {
  CollectionPermission,
  FileOperationFormat,
  type NavigationNode,
  NavigationNodeType,
  type ProsemirrorData,
} from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { sortNavigationNodes } from "@shared/utils/collections";
import type CollectionsStore from "~/stores/CollectionsStore";
import Document from "~/models/Document";
import ParanoidModel from "~/models/base/ParanoidModel";
import { client } from "~/utils/ApiClient";
import User from "./User";
import Field from "./decorators/Field";
import { AfterChange } from "./decorators/Lifecycle";

export default class Collection extends ParanoidModel {
  static modelName = "Collection";

  store: CollectionsStore;

  /** The name of the collection. */
  @Field
  @observable
  name: string;

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
  color?: string | null;

  /** The default permission for workspace users. */
  @Field
  @observable
  permission?: CollectionPermission;

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

  /** The child documents of the collection. */
  @observable
  documents?: NavigationNode[];

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
  archivedBy?: User;

  @computed
  get searchContent(): string {
    return this.name;
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
    return !this.permission;
  }

  /** Returns whether the collection description is not empty. */
  @computed
  get hasDescription(): boolean {
    return this.data ? !ProsemirrorHelper.isEmptyData(this.data) : false;
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

  @computed
  get sortedDocuments(): NavigationNode[] | undefined {
    if (!this.documents) {
      return undefined;
    }
    return sortNavigationNodes(this.documents, this.sort);
  }

  /** The initial letter of the collection name as a string. */
  @computed
  get initial() {
    return (this.name ? this.name[0] : "?").toUpperCase();
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

  @computed
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

      runInAction("Collection#fetchDocuments", () => {
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
    document: Pick<Document, "id" | "title" | "url" | "color" | "icon">
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
          node.url = document.url;
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
   * memory. Does not add the document to the database or store.
   *
   * @param document The document to add.
   * @param parentDocumentId The id of the document to add the new document to.
   */
  @action
  addDocument(document: Document, parentDocumentId?: string) {
    if (!this.documents) {
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

  @action
  updateIndex(index: string) {
    this.index = index;
  }

  getChildrenForDocument(documentId: string) {
    let result: NavigationNode[] = [];

    const travelNodes = (nodes: NavigationNode[]) => {
      nodes.forEach((node) => {
        if (node.id === documentId) {
          result = node.children;
          return;
        }

        return travelNodes(node.children);
      });
    };

    if (this.sortedDocuments) {
      travelNodes(this.sortedDocuments);
    }

    return result;
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

  private isFetching = false;
}
