import invariant from "invariant";
import { action, runInAction, computed } from "mobx";
import Star from "~/models/Star";
import type { PaginationParams, Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store from "./base/Store";
export default class StarsStore extends Store<Star> {
  constructor(rootStore: RootStore) {
    super(rootStore, Star);
  }
  @action
  async create(params: Properties<Star>): Promise<Star> {
    const { notebookId, ...rest } = params;
    const wireParams = {
      ...rest,
      collectionId: notebookId,
    };
    return super.create(wireParams);
  }
  @action
  fetchPage = async (params?: PaginationParams): Promise<Star[]> => {
    this.isFetching = true;
    try {
      const res = await client.post(`/stars.list`, params);
      invariant(res?.data, "Data not available");
      return runInAction(`StarsStore#fetchPage`, () => {
        res.data.documents.forEach(this.rootStore.notes.add);
        const models = res.data.stars.map(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
        return models;
      });
    } finally {
      this.isFetching = false;
    }
  };
  @computed
  get orderedData(): Star[] {
    const stars = Array.from(this.data.values());
    return stars.sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }
      return a.index < b.index ? -1 : 1;
    });
  }
}
