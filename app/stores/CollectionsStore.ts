import invariant from "invariant";
import concat from "lodash/concat";
import find from "lodash/find";
import last from "lodash/last";
import sortBy from "lodash/sortBy";
import { computed, action } from "mobx";
import {
  CollectionPermission,
  FileOperationFormat,
  NavigationNode,
} from "@shared/types";
import Collection from "~/models/Collection";
import { Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store from "./base/Store";

enum DocumentPathItemType {
  Collection = "collection",
  Document = "document",
}

export type DocumentPathItem = {
  type: DocumentPathItemType;
  id: string;
  collectionId: string;
  title: string;
  url: string;
};

export type DocumentPath = DocumentPathItem & {
  path: DocumentPathItem[];
};

export default class CollectionsStore extends Store<Collection> {
  constructor(rootStore: RootStore) {
    super(rootStore, Collection);
  }

  /**
   * Returns the currently active collection, or undefined if not in the context of a collection.
   *
   * @returns The active Collection or undefined
   */
  @computed
  get active(): Collection | undefined {
    return this.rootStore.ui.activeCollectionId
      ? this.data.get(this.rootStore.ui.activeCollectionId)
      : undefined;
  }

  @computed
  get orderedData(): Collection[] {
    let collections = Array.from(this.data.values());
    collections = collections
      .filter((collection) => !collection.deletedAt)
      .filter(
        (collection) =>
          this.rootStore.policies.abilities(collection.id).readDocument
      );
    return collections.sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }

      return a.index < b.index ? -1 : 1;
    });
  }

  /**
   * Returns all collections that are require explicit permission to access.
   */
  @computed
  get private(): Collection[] {
    return this.all.filter((collection) => collection.isPrivate);
  }

  /**
   * Returns all collections that are accessible by default.
   */
  @computed
  get nonPrivate(): Collection[] {
    return this.all.filter((collection) => !collection.isPrivate);
  }

  /**
   * Returns all collections that are accessible to the current user.
   */
  @computed
  get all(): Collection[] {
    return sortBy(
      Array.from(this.data.values()),
      (collection) => collection.name
    );
  }

  /**
   * List of paths to each of the documents, where paths are composed of id and title/name pairs
   */
  @computed
  get pathsToDocuments(): DocumentPath[] {
    const results: DocumentPathItem[][] = [];

    const travelDocuments = (
      documentList: NavigationNode[],
      collectionId: string,
      path: DocumentPathItem[]
    ) =>
      documentList.forEach((document: NavigationNode) => {
        const { id, title, url } = document;
        const node = {
          type: DocumentPathItemType.Document,
          id,
          collectionId,
          title,
          url,
        };
        results.push(concat(path, node));
        travelDocuments(document.children, collectionId, concat(path, [node]));
      });

    if (this.isLoaded) {
      this.data.forEach((collection) => {
        const { id, name, path } = collection;
        const node = {
          type: DocumentPathItemType.Collection,
          id,
          collectionId: id,
          title: name,
          url: path,
        };
        results.push([node]);

        if (collection.documents) {
          travelDocuments(collection.documents, id, [node]);
        }
      });
    }

    return results.map((result) => {
      const tail = last(result) as DocumentPathItem;
      return { ...tail, path: result };
    });
  }

  @action
  import = async (
    attachmentId: string,
    options: { format?: string; permission?: CollectionPermission | null }
  ) => {
    await client.post("/collections.import", {
      attachmentId,
      ...options,
    });
  };

  @action
  move = async (collectionId: string, index: string) => {
    const res = await client.post("/collections.move", {
      id: collectionId,
      index,
    });
    invariant(res?.success, "Collection could not be moved");
    const collection = this.get(collectionId);

    if (collection) {
      collection.updateIndex(res.data.index);
    }
  };

  async update(params: Properties<Collection>): Promise<Collection> {
    const result = await super.update(params);

    // If we're changing sharing permissions on the collection then we need to
    // remove all locally cached policies for documents in the collection as they
    // are now invalid
    if (params.sharing !== undefined) {
      this.rootStore.documents.inCollection(result.id).forEach((document) => {
        this.rootStore.policies.remove(document.id);
      });
    }

    return result;
  }

  @action
  async fetch(id: string, options?: { force: boolean }): Promise<Collection> {
    const model = await super.fetch(id, options);
    await model.fetchDocuments(options);
    return model;
  }

  @computed
  get publicCollections() {
    return this.orderedData.filter(
      (collection) =>
        collection.permission &&
        Object.values(CollectionPermission).includes(collection.permission)
    );
  }

  star = async (collection: Collection, index?: string) => {
    await this.rootStore.stars.create({
      collectionId: collection.id,
      index,
    });
  };

  unstar = async (collection: Collection) => {
    const star = this.rootStore.stars.orderedData.find(
      (star) => star.collectionId === collection.id
    );
    await star?.delete();
  };

  getPathForDocument(documentId: string): DocumentPath | undefined {
    return this.pathsToDocuments.find((path) => path.id === documentId);
  }

  titleForDocument(documentPath: string): string | undefined {
    const path = this.pathsToDocuments.find(
      (path) => path.url === documentPath
    );
    if (path) {
      return path.title;
    }

    return;
  }

  getByUrl(url: string): Collection | null | undefined {
    return find(this.orderedData, (col: Collection) => url.endsWith(col.urlId));
  }

  async delete(collection: Collection) {
    await super.delete(collection);
    await this.rootStore.documents.fetchRecentlyUpdated();
    await this.rootStore.documents.fetchRecentlyViewed();
  }

  export = (format: FileOperationFormat, includeAttachments: boolean) =>
    client.post("/collections.export_all", {
      format,
      includeAttachments,
    });
}
