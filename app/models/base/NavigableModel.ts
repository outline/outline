import { action, computed, observable, runInAction } from "mobx";
import { JSONObject, type NavigationNode } from "@shared/types";
import { client } from "~/utils/ApiClient";
import Model from "./Model";
import type Document from "../Document";

export default abstract class NavigableModel extends Model {
  private isFetching = false;

  /** The document ID associated with this model. */
  documentId?: string;

  @observable
  node?: NavigationNode;

  /**
   * Fetches the child documents structure from the server.
   */
  async fetchDocuments(options: {
    path: string;
    params: JSONObject;
    force?: boolean;
  }) {
    if (this.isFetching) {
      return;
    }

    if (this.documents && options.force !== true) {
      return;
    }

    try {
      this.isFetching = true;
      const res = await client.post(options.path, options.params);

      runInAction(`${NavigableModel.modelName}#fetchDocuments`, () => {
        this.node = res.data;
      });
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Child documents structure of the document shared with this membership.
   */
  @computed
  get documents(): NavigationNode[] | undefined {
    return this.node?.children;
  }

  @action
  setDocuments(value: NavigationNode[] | undefined) {
    if (this.node && value) {
      this.node.children = value;
    }
  }

  /**
   * Returns the document path from the original document shared with this membership.
   */
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

    if (this.node) {
      travelNodes([this.node], path);
    }

    return path;
  }

  /**
   * Returns the child documents structure for the document.
   */
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

    if (this.node) {
      travelNodes([this.node]);
    }

    return result;
  }

  /**
   * Adds the document identified by the given id to the model in
   * memory. Does not add the document to the database or store.
   *
   * @param document The document to add.
   * @param parentDocumentId The id of the document to add the new document to.
   */
  @action
  addDocument(document: Document, parentDocumentId: string) {
    if (!this.documents || !document || !parentDocumentId?.trim()) {
      return;
    }

    if (this.documentId && parentDocumentId === this.documentId) {
      this.setDocuments([document.asNavigationNode, ...(this.documents ?? [])]);
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
   * Removes the document identified by the given id from the model in
   * memory. Does not remove the document from the database.
   *
   * @param documentId The id of the document to remove.
   */
  @action
  removeDocument(documentId: string) {
    if (!this.documents) {
      return;
    }

    this.setDocuments(
      this.documents.filter(function f(node): boolean {
        if (node.id === documentId) {
          return false;
        }

        if (node.children) {
          node.children = node.children.filter(f);
        }

        return true;
      })
    );
  }
}
