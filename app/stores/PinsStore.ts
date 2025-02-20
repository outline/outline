import invariant from "invariant";
import { action, runInAction, computed } from "mobx";
import Pin from "~/models/Pin";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import RootStore from "./RootStore";
import Store from "./base/Store";

type FetchParams = PaginationParams & { collectionId?: string };

export default class PinsStore extends Store<Pin> {
  constructor(rootStore: RootStore) {
    super(rootStore, Pin);
  }

  @action
  async fetchOne({
    documentId,
    collectionId,
  }: {
    documentId: string;
    collectionId: string | null;
  }) {
    const pin = this.orderedData.find(
      (p) => p.documentId === documentId && p.collectionId === collectionId
    );

    if (pin) {
      return pin;
    }

    this.isFetching = true;

    try {
      const res = await client.post(`/${this.apiEndpoint}.info`, {
        documentId,
        collectionId,
      });
      invariant(res?.data, "Data should be available");
      return this.add(res.data);
    } catch (err) {
      if (err instanceof AuthorizationError || err instanceof NotFoundError) {
        return;
      }
      throw err;
    } finally {
      this.isFetching = false;
    }
  }

  @action
  fetchPage = async (params?: FetchParams | undefined): Promise<Pin[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/pins.list`, params);
      invariant(res?.data, "Data not available");

      let models: Pin[] = [];
      runInAction(`PinsStore#fetchPage`, () => {
        res.data.documents.forEach(this.rootStore.documents.add);
        models = res.data.pins.map(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
      });

      return models;
    } finally {
      this.isFetching = false;
    }
  };

  inCollection = (collectionId: string) =>
    computed(() => this.orderedData)
      .get()
      .filter((pin) => pin.collectionId === collectionId);

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
