import { pick, trim } from "lodash";
import { action, computed, observable } from "mobx";
import BaseModel from "~/models/BaseModel";
import Document from "~/models/Document";
import { NavigationNode } from "~/types";
import { client } from "~/utils/ApiClient";

export default class Collection extends BaseModel {
  @observable
  isSaving: boolean;

  @observable
  isLoadingUsers: boolean;

  id: string;

  name: string;

  description: string;

  icon: string;

  color: string;

  permission: "read" | "read_write" | void;

  sharing: boolean;

  index: string;

  documents: NavigationNode[];

  createdAt: string;

  updatedAt: string;

  deletedAt: string | null | undefined;

  sort: {
    field: string;
    direction: "asc" | "desc";
  };

  url: string;

  urlId: string;

  @computed
  get isEmpty(): boolean {
    return this.documents.length === 0;
  }

  @computed
  get documentIds(): string[] {
    const results: string[] = [];

    const travelNodes = (nodes: NavigationNode[]) =>
      nodes.forEach((node) => {
        results.push(node.id);
        travelNodes(node.children);
      });

    travelNodes(this.documents);
    return results;
  }

  @computed
  get hasDescription(): boolean {
    return !!trim(this.description, "\\").trim();
  }

  @action
  updateDocument(document: Document) {
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

    if (this.documents) {
      travelNodes(this.documents);
    }

    return result;
  }

  pathToDocument(documentId: string) {
    let path: NavigationNode[] | undefined;

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

        return travelNodes(node.children, newPath);
      });
    };

    if (this.documents) {
      travelNodes(this.documents, []);
    }

    return path || [];
  }

  toJS = () => {
    return pick(this, [
      "id",
      "name",
      "color",
      "description",
      "sharing",
      "icon",
      "permission",
      "sort",
      "index",
    ]);
  };

  export = () => {
    return client.get("/collections.export", {
      id: this.id,
    });
  };
}
