// @flow
import { pick, trim } from "lodash";
import { action, computed, observable } from "mobx";
import BaseModel from "models/BaseModel";
import Document from "models/Document";
import type { NavigationNode } from "types";
import { client } from "utils/ApiClient";

export default class Collection extends BaseModel {
  @observable isSaving: boolean;
  @observable isLoadingUsers: boolean;

  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  private: boolean;
  documents: NavigationNode[];
  createdAt: ?string;
  updatedAt: ?string;
  deletedAt: ?string;
  sort: { field: string, direction: "asc" | "desc" };
  url: string;

  @computed
  get isPrivate(): boolean {
    return this.private;
  }

  @computed
  get isEmpty(): boolean {
    return this.documents.length === 0;
  }

  @computed
  get documentIds(): string[] {
    const results = [];
    const travelDocuments = (documentList, path) =>
      documentList.forEach((document) => {
        results.push(document.id);
        travelDocuments(document.children);
      });

    travelDocuments(this.documents);
    return results;
  }

  @computed
  get hasDescription(): string {
    return !!trim(this.description, "\\").trim();
  }

  @action
  updateDocument(document: Document) {
    const travelDocuments = (documentList, path) =>
      documentList.forEach((d) => {
        if (d.id === document.id) {
          d.title = document.title;
          d.url = document.url;
        } else {
          travelDocuments(d.children);
        }
      });

    travelDocuments(this.documents);
  }

  getDocumentChildren(documentId: string): NavigationNode[] {
    let result = [];
    const traveler = (nodes) => {
      nodes.forEach((childNode) => {
        if (childNode.id === documentId) {
          result = childNode.children;
          return;
        }
        return traveler(childNode.children);
      });
    };

    if (this.documents) {
      traveler(this.documents);
    }

    return result;
  }

  pathToDocument(documentId: string) {
    let path;
    const traveler = (nodes, previousPath) => {
      nodes.forEach((childNode) => {
        const newPath = [...previousPath, childNode];
        if (childNode.id === documentId) {
          path = newPath;
          return;
        }
        return traveler(childNode.children, newPath);
      });
    };

    if (this.documents) {
      traveler(this.documents, []);
      if (path) return path;
    }

    return [];
  }

  toJS = () => {
    return pick(this, [
      "id",
      "name",
      "color",
      "description",
      "icon",
      "private",
      "sort",
    ]);
  };

  export = () => {
    return client.get(
      "/collections.export",
      { id: this.id },
      { download: true }
    );
  };
}
