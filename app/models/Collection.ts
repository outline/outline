import { trim } from "lodash";
import { action, computed, observable } from "mobx";
import BaseModel from "~/models/BaseModel";
import Document from "~/models/Document";
import { NavigationNode } from "~/types";
import { client } from "~/utils/ApiClient";
import Field from "./decorators/Field";

export default class Collection extends BaseModel {
  @observable
  isSaving: boolean;

  @observable
  isLoadingUsers: boolean;

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
  permission: "read" | "read_write" | void;

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

  documents: NavigationNode[];

  createdAt: string;

  updatedAt: string;

  deletedAt: string | null | undefined;

  url: string;

  urlId: string;

  @computed
  get isEmpty(): boolean {
    return (
      this.documents.length === 0 &&
      this.store.rootStore.documents.inCollection(this.id).length === 0
    );
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

  documentIndexInCollection(documentId: string) {
    let index: number | undefined;
    const findIndex = (nodes: NavigationNode[]) => {
      if (index) {
        return;
      }

      nodes.forEach((node, i) => {
        if (node.id === documentId) {
          index = i;
          return;
        }
      });

      nodes.forEach((node) => {
        findIndex(node.children);
      });
    };

    findIndex(this.documents);
    return index;
  }

  pathToDocument(documentId: string) {
    let path: NavigationNode[] | undefined;
    const document = this.store.rootStore.documents.get(documentId);

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
          document?.parentDocumentId &&
          node?.id === document?.parentDocumentId
        ) {
          path = [...newPath, document.asNavigationNode];
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

  export = () => {
    return client.get("/collections.export", {
      id: this.id,
    });
  };
}
