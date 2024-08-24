import invariant from "invariant";
import { action, computed, observable, reaction, runInAction } from "mobx";
import {
  CollectionPermission,
  FileOperationFormat,
  NavigationNode,
  type ProsemirrorData,
} from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { sortNavigationNodes } from "@shared/utils/collections";
import type CollectionsStore from "~/stores/CollectionsStore";
import Document from "~/models/Document";
import ParanoidModel from "~/models/base/ParanoidModel";
import { client } from "~/utils/ApiClient";
import Field from "./decorators/Field";

export default class Collection extends ParanoidModel {
  static modelName = "Collection";

  store: CollectionsStore;

  @observable
  isSaving: boolean;

  isFetching = false;

  @Field
  @observable
  id: string;

  /**
   * The name of the collection.
   */
  @Field
  @observable
  name: string;

  @Field
  @observable.shallow
  data: ProsemirrorData;

  /**
   * An icon (or) emoji to use as the collection icon.
   */
  @Field
  @observable
  icon: string;

  /**
   * The color to use for the collection icon and other highlights.
   */
  @Field
  @observable
  color?: string | null;

  /**
   * The default permission for workspace users.
   */
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

  /**
   * The sort index for the collection.
   */
  @Field
  @observable
  index: string;

  /**
   * The sort field and direction for documents in the collection.
   */
  @Field
  @observable
  sort: {
    field: string;
    direction: "asc" | "desc";
  };

  @observable
  documents?: NavigationNode[];

  /**
   * @deprecated Use path instead.
   */
  @observable
  url: string;

  @observable
  urlId: string;

  constructor(fields: Partial<Collection>, store: CollectionsStore) {
    super(fields, store);

    const resetDocumentPolicies = () => {
      this.store.rootStore.documents
        .inCollection(this.id)
        .forEach((document) => {
          this.store.rootStore.policies.remove(document.id);
        });
    };

    reaction(() => this.permission, resetDocumentPolicies);
    reaction(() => this.sharing, resetDocumentPolicies);
  }

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

  /**
   * Check whether this collection has a description.
   *
   * @returns boolean
   */
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

  @computed
  get sortedDocuments(): NavigationNode[] | undefined {
    if (!this.documents) {
      return undefined;
    }
    return sortNavigationNodes(this.documents, this.sort);
  }

  /**
   * The initial letter of the collection name.
   *
   * @returns string
   */
  @computed
  get initial() {
    return (this.name ? this.name[0] : "?").toUpperCase();
  }

  @computed
  get path() {
    return this.url;
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
  updateDocument(document: Pick<Document, "id" | "title" | "url">) {
    if (!this.documents) {
      return;
    }

    const travelNodes = (nodes: NavigationNode[]) =>
      nodes.forEach((node) => {
        if (node.id === document.id) {
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

  @action
  updateIndex(index: string) {
    this.index = index;
  }

  getDocumentChildren(documentId: string) {
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

  export = (format: FileOperationFormat, includeAttachments: boolean) =>
    client.post("/collections.export", {
      id: this.id,
      format,
      includeAttachments,
    });
}
