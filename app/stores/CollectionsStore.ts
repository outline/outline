import invariant from "invariant";
import { concat, find, last } from "lodash";
import { computed, action } from "mobx";
import Collection from "models/Collection";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/ApiClient' or its corres... Remove this comment to see the full error message
import { client } from "utils/ApiClient";

export type DocumentPathItem = {
  id: string;
  collectionId: string;
  title: string;
  url: string;
  type: "collection" | "document";
};

export type DocumentPath = DocumentPathItem & {
  path: DocumentPathItem[];
};

export default class CollectionsStore extends BaseStore<Collection> {
  constructor(rootStore: RootStore) {
    super(rootStore, Collection);
  }

  @computed
  get active(): Collection | null | undefined {
    return this.rootStore.ui.activeCollectionId
      ? this.data.get(this.rootStore.ui.activeCollectionId)
      : undefined;
  }

  @computed
  get orderedData(): Collection[] {
    let collections = Array.from(this.data.values());
    collections = collections.filter((collection) =>
      collection.deletedAt ? false : true
    );
    return collections.sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }

      return a.index < b.index ? -1 : 1;
    });
  }

  /**
   * List of paths to each of the documents, where paths are composed of id and title/name pairs
   */
  @computed
  get pathsToDocuments(): DocumentPath[] {
    // @ts-expect-error ts-migrate(7034) FIXME: Variable 'results' implicitly has type 'any[]' in ... Remove this comment to see the full error message
    const results = [];

    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documentList' implicitly has an 'any' t... Remove this comment to see the full error message
    const travelDocuments = (documentList, collectionId, path) =>
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
      documentList.forEach((document) => {
        const { id, title, url } = document;
        const node = {
          id,
          collectionId,
          title,
          url,
          type: "document",
        };
        results.push(concat(path, node));
        travelDocuments(document.children, collectionId, concat(path, [node]));
      });

    if (this.isLoaded) {
      this.data.forEach((collection) => {
        const { id, name, url } = collection;
        const node = {
          id,
          collectionId: id,
          title: name,
          url,
          type: "collection",
        };
        results.push([node]);
        travelDocuments(collection.documents, id, [node]);
      });
    }

    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'results' implicitly has an 'any[]' type.
    return results.map((result) => {
      const tail = last(result);
      // @ts-expect-error ts-migrate(2698) FIXME: Spread types may only be created from object types... Remove this comment to see the full error message
      return { ...tail, path: result };
    });
  }

  @action
  import = async (attachmentId: string) => {
    await client.post("/collections.import", {
      type: "outline",
      attachmentId,
    });
  };

  @action
  move = async (collectionId: string, index: string) => {
    const res = await client.post("/collections.move", {
      id: collectionId,
      index,
    });
    invariant(res && res.success, "Collection could not be moved");
    const collection = this.get(collectionId);

    if (collection) {
      collection.updateIndex(res.data.index);
    }
  };

  async update(params: Record<string, any>): Promise<Collection> {
    const result = await super.update(params);

    // If we're changing sharing permissions on the collection then we need to
    // remove all locally cached policies for documents in the collection as they
    // are now invalid
    if (params.sharing !== undefined) {
      const collection = this.get(params.id);

      if (collection) {
        collection.documentIds.forEach((id) => {
          this.rootStore.policies.remove(id);
        });
      }
    }

    return result;
  }

  @action
  async fetch(id: string, options: Record<string, any> = {}): Promise<any> {
    const item = this.get(id) || this.getByUrl(id);
    if (item && !options.force) return item;
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.info`, {
        id,
      });
      invariant(res && res.data, "Collection not available");
      this.addPolicies(res.policies);
      return this.add(res.data);
    } catch (err) {
      if (err.statusCode === 403) {
        this.remove(id);
      }

      throw err;
    } finally {
      this.isFetching = false;
    }
  }

  getPathForDocument(documentId: string): DocumentPath | null | undefined {
    return this.pathsToDocuments.find((path) => path.id === documentId);
  }

  // @ts-expect-error ts-migrate(7030) FIXME: Not all code paths return a value.
  titleForDocument(documentUrl: string): string | null | undefined {
    const path = this.pathsToDocuments.find((path) => path.url === documentUrl);
    if (path) return path.title;
  }

  getByUrl(url: string): Collection | null | undefined {
    return find(this.orderedData, (col: Collection) => url.endsWith(col.urlId));
  }

  delete = async (collection: Collection) => {
    await super.delete(collection);
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
    this.rootStore.documents.fetchRecentlyUpdated();
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
    this.rootStore.documents.fetchRecentlyViewed();
  };

  export = () => {
    return client.post("/collections.export_all");
  };
}
