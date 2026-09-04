import invariant from "invariant";
import { action, computed } from "mobx";
import Pin from "~/models/Pin";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import IndexedStore from "./base/IndexedStore";
import type RootStore from "./RootStore";
import type { PaginatedResponse } from "./base/Store";

type FetchParams = PaginationParams & { collectionId?: string };

export default class PinsStore extends IndexedStore<Pin> {
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
      if (!res) {
        return;
      }
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

  fetchPage = async (params?: FetchParams): Promise<PaginatedResponse<Pin>> =>
    this.fetchPaginated("/pins.list", params, {
      key: "pins",
      related: { documents: this.rootStore.documents },
    });

  inCollection = (collectionId: string) =>
    this.orderedData.filter((pin) => pin.collectionId === collectionId);

  @computed
  get home() {
    return this.orderedData.filter((pin) => !pin.collectionId);
  }
}
