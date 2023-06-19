import { trim } from "lodash";
import { action, computed, observable, reaction, runInAction } from "mobx";
import {
  CollectionPermission,
  FileOperationFormat,
  NavigationNode,
} from "@shared/types";
import { sortNavigationNodes } from "@shared/utils/collections";
import type CollectionsStore from "~/stores/CollectionsStore";
import Document from "~/models/Document";
import ParanoidModel from "~/models/ParanoidModel";
import { client } from "~/utils/ApiClient";
import Field from "./decorators/Field";

export default class Collection extends ParanoidModel {
  store: CollectionsStore;

  @observable
  isSaving: boolean;

  isFetching = false;

  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  @Field
  @observable
  description: string;

  @Field
  @observable
  icon: string;

  @Field
  @observable
  color: string;

  @Field
  @observable
  permission: CollectionPermission | void;

  @Field
  @observable
  sharing: boolean;

  @Field
  @observable
  index: string;

  @Field
  @observable
  sort: {
    field: string;
    direction: "asc" | "desc";
  };

  @observable
  documents?: NavigationNode[];

  url: string;

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

  @computed
  get hasDescription(): boolean {
    return !!trim(this.description, "\\").trim();
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

  fetchDocuments = async (options?: { force: boolean }) => {
    if (this.isFetching) {
      return;
    }
    if (this.documents && options?.force !== true) {
      return;
    }

    try {
      this.isFetching = true;
      const { data } = await client.post("/collections.documents", {
        id: this.id,
      });

      runInAction("Collection#fetchDocuments", () => {
        this.documents = data;
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
  star = async () => this.store.star(this);

  @action
  unstar = async () => this.store.unstar(this);

  export = (format: FileOperationFormat) =>
    client.post("/collections.export", {
      id: this.id,
      format,
    });
}
