import invariant from "invariant";
import { observable, runInAction } from "mobx";
import { JSONObject, NavigationNode } from "@shared/types";
import { client } from "~/utils/ApiClient";
import ParanoidModel from "./ParanoidModel";

export default abstract class NavigableModel extends ParanoidModel {
  private isFetching = false;

  /** The child documents structure of the model. */
  @observable
  documents?: NavigationNode[];

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
      invariant(res?.data, "Data should be available");

      runInAction(`${NavigableModel.modelName}#fetchDocuments`, () => {
        this.documents = res.data;
      });
    } finally {
      this.isFetching = false;
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

    if (this.documents) {
      travelNodes(this.documents, path);
    }

    return path;
  }
}
