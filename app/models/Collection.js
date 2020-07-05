// @flow
import { pick } from "lodash";
import { action, computed, observable } from "mobx";
import BaseModel from "models/BaseModel";
import Document from "models/Document";
import { client } from "utils/ApiClient";
import type { NavigationNode } from "types";

export default class Collection extends BaseModel {
  @observable isSaving: boolean;
  @observable isLoadingUsers: boolean;

  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  private: boolean;
  type: "atlas" | "journal";
  documents: NavigationNode[];
  createdAt: ?string;
  updatedAt: ?string;
  deletedAt: ?string;
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
      documentList.forEach(document => {
        results.push(document.id);
        travelDocuments(document.children);
      });

    travelDocuments(this.documents);
    return results;
  }

  @action
  updateDocument(document: Document) {
    const travelDocuments = (documentList, path) =>
      documentList.forEach(d => {
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
    const traveler = nodes => {
      nodes.forEach(childNode => {
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

  pathToDocument(document: Document) {
    let path;
    const traveler = (nodes, previousPath) => {
      nodes.forEach(childNode => {
        const newPath = [...previousPath, childNode];
        if (childNode.id === document.id) {
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

  @action
  addDocumentToStructure(
    document: NavigationNode,
    parentDocumentId: ?string,
    index: ?number
  ) {
    if (!parentDocumentId) {
      this.documents.splice(
        index !== undefined && index !== null ? index : this.documents.length,
        0,
        document
      );
    } else {
      const recursivelyAddDocument = (nodes: NavigationNode[]) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === parentDocumentId) {
            nodes[i].children.splice(
              index !== undefined && index !== null
                ? index
                : nodes[i].children.length,
              0,
              document
            );
            return true;
          }

          const isAdded = recursivelyAddDocument(nodes[i].children);
          if (isAdded) return true;
        }
      };

      recursivelyAddDocument(this.documents);
    }
  }

  @action
  removeDocumentInStructure(documentId: string) {
    const recursivelyRemoveDocument = nodes => {
      const index = nodes.findIndex(item => item.id === documentId);
      if (index !== -1) {
        nodes.splice(index, 1);
        return true;
      }

      for (let i = 0; i < nodes.length; i++) {
        const isFound = recursivelyRemoveDocument(nodes[i].children);
        if (isFound) return true;
      }
      return false;
    };

    return recursivelyRemoveDocument(this.documents);
  }

  toJS = () => {
    return pick(this, [
      "id",
      "name",
      "color",
      "description",
      "icon",
      "private",
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
