import { pick, trim } from "lodash";
import { action, computed, observable } from "mobx";
import BaseModel from "models/BaseModel";
import Document from "models/Document";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { NavigationNode } from "types";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/ApiClient' or its corres... Remove this comment to see the full error message
import { client } from "utils/ApiClient";

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
    // @ts-expect-error ts-migrate(7034) FIXME: Variable 'results' implicitly has type 'any[]' in ... Remove this comment to see the full error message
    const results = [];

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documentList' implicitly has an 'any' t... Remove this comment to see the full error message
    const travelDocuments = (documentList, path) =>
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
      documentList.forEach((document) => {
        results.push(document.id);
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
        travelDocuments(document.children);
      });

    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    travelDocuments(this.documents);
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'results' implicitly has an 'any[]' type.
    return results;
  }

  @computed
  get hasDescription(): boolean {
    return !!trim(this.description, "\\").trim();
  }

  @action
  updateDocument(document: Document) {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documentList' implicitly has an 'any' t... Remove this comment to see the full error message
    const travelDocuments = (documentList, path) =>
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'd' implicitly has an 'any' type.
      documentList.forEach((d) => {
        if (d.id === document.id) {
          d.title = document.title;
          d.url = document.url;
        } else {
          // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
          travelDocuments(d.children);
        }
      });

    // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
    travelDocuments(this.documents);
  }

  @action
  updateIndex(index: string) {
    this.index = index;
  }

  getDocumentChildren(documentId: string): NavigationNode[] {
    // @ts-expect-error ts-migrate(7034) FIXME: Variable 'result' implicitly has type 'any[]' in s... Remove this comment to see the full error message
    let result = [];

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'nodes' implicitly has an 'any' type.
    const traveler = (nodes) => {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'childNode' implicitly has an 'any' type... Remove this comment to see the full error message
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

    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'result' implicitly has an 'any[]' type.
    return result;
  }

  pathToDocument(documentId: string) {
    let path;

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'nodes' implicitly has an 'any' type.
    const traveler = (nodes, previousPath) => {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'childNode' implicitly has an 'any' type... Remove this comment to see the full error message
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
