import invariant from "invariant";
import { action, runInAction } from "mobx";
import Pin from "~/models/Pin";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

type FetchParams = PaginationParams & { collectionId?: string };

export default class PinsStore extends BaseStore<Pin> {
  actions = [RPCAction.Delete, RPCAction.List, RPCAction.Create];

  constructor(rootStore: RootStore) {
    super(rootStore, Pin);
  }

  @action
  fetchPage = async (params: FetchParams | undefined): Promise<void> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/pins.list`, params);
      invariant(res && res.data, "Data not available");
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
    return this.orderedData.filter((pin) => pin.collectionId === collectionId);
  };
}
