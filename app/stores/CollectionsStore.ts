import invariant from "invariant";
import { find } from "lodash";
import { computed, action } from "mobx";
import { CollectionPermission, FileOperationFormat } from "@shared/types";
import Collection from "~/models/Collection";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

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

  @action
  import = async (attachmentId: string, format?: string) => {
    await client.post("/collections.import", {
      type: "outline",
      format,
      attachmentId,
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
  async fetch(
    id: string,
    options: Record<string, any> = {}
  ): Promise<Collection> {
    const item = this.get(id) || this.getByUrl(id);
    if (item && !options.force) {
      return item;
    }
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.info`, {
        id,
      });
      invariant(res?.data, "Collection not available");
      this.addPolicies(res.policies);
      return this.add(res.data);
    } catch (err) {
      if (err instanceof AuthorizationError || err instanceof NotFoundError) {
        this.remove(id);
      }

      throw err;
    } finally {
      this.isFetching = false;
    }
  }

  @computed
  get publicCollections() {
    return this.orderedData.filter(
      (collection) =>
        collection.permission &&
        Object.values(CollectionPermission).includes(collection.permission)
    );
  }

  star = async (collection: Collection) => {
    await this.rootStore.stars.create({
      collectionId: collection.id,
    });
  };

  unstar = async (collection: Collection) => {
    const star = this.rootStore.stars.orderedData.find(
      (star) => star.collectionId === collection.id
    );
    await star?.delete();
  };

  getByUrl(url: string): Collection | null | undefined {
    return find(this.orderedData, (col: Collection) => url.endsWith(col.urlId));
  }

  delete = async (collection: Collection) => {
    await super.delete(collection);
    this.rootStore.documents.fetchRecentlyUpdated();
    this.rootStore.documents.fetchRecentlyViewed();
  };

  export = (format: FileOperationFormat) => {
    return client.post("/collections.export_all", {
      format,
    });
  };
}
