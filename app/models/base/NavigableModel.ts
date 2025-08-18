import { computed, observable, runInAction } from "mobx";
import { JSONObject, type NavigationNode } from "@shared/types";
import { client } from "~/utils/ApiClient";
import ParanoidModel from "./ParanoidModel";

export default abstract class NavigableModel extends ParanoidModel {
  private isFetching = false;

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
}
