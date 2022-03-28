import invariant from "invariant";
import { action, runInAction, computed } from "mobx";
import Pin from "~/models/Pin";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

type FetchParams = PaginationParams & { collectionId?: string };

export default class PinsStore extends BaseStore<Pin> {
  constructor(rootStore: RootStore) {
    super(rootStore, Pin);
  }

  @action
  fetchPage = async (params?: FetchParams | undefined): Promise<void> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/pins.list`, params);
      invariant(res?.data, "Data not available");
      runInAction(`PinsStore#fetchPage`, () => {
        res.data.documents.forEach(this.rootStore.documents.add);
        res.data.pins.forEach(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
      });
    } finally {
      this.isFetching = false;
    }
  };

  inCollection = (collectionId: string) => {
    return computed(() => this.orderedData)
      .get()
      .filter((pin) => pin.collectionId === collectionId);
  };

  @computed
  get home() {
    return this.orderedData.filter((pin) => !pin.collectionId);
  }

  @computed
  get orderedData(): Pin[] {
    const pins = Array.from(this.data.values());

    return pins.sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }

      return a.index < b.index ? -1 : 1;
    });
  }
}
