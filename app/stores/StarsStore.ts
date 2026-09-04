import Star from "~/models/Star";
import type { PaginationParams } from "~/types";
import IndexedStore from "./base/IndexedStore";
import type RootStore from "./RootStore";
import type { PaginatedResponse } from "./base/Store";

export default class StarsStore extends IndexedStore<Star> {
  constructor(rootStore: RootStore) {
    super(rootStore, Star);
  }

  fetchPage = async (
    params?: PaginationParams
  ): Promise<PaginatedResponse<Star>> =>
    this.fetchPaginated("/stars.list", params, {
      key: "stars",
      related: { documents: this.rootStore.documents },
    });
}
