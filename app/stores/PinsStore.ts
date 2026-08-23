import invariant from "invariant";
import { action, runInAction, computed } from "mobx";
import Pin from "~/models/Pin";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import type RootStore from "./RootStore";
import Store from "./base/Store";
type FetchParams = PaginationParams & {
  notebookId?: string;
};
export default class PinsStore extends Store<Pin> {
  constructor(rootStore: RootStore) {
    super(rootStore, Pin);
  }
  @action
  async fetchOne({
    noteId,
    notebookId,
  }: {
    noteId: string;
    notebookId: string | null;
  }) {
    const pin = this.orderedData.find(
      (p) => p.noteId === noteId && p.notebookId === notebookId
    );
    if (pin) {
      return pin;
    }
    this.isFetching = true;
    try {
      const res = await client.post(`/${this.apiEndpoint}.info`, {
        documentId: noteId,
        collectionId: notebookId,
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
  @action
  fetchPage = async (params?: FetchParams): Promise<Pin[]> => {
    this.isFetching = true;
    try {
      const { notebookId, ...rest } = params ?? {};
      const wireParams = notebookId
        ? { ...rest, collectionId: notebookId }
        : params;
      const res = await client.post(`/pins.list`, wireParams);
      invariant(res?.data, "Data not available");
      let models: Pin[] = [];
      runInAction(`PinsStore#fetchPage`, () => {
        res.data.documents.forEach(this.rootStore.notes.add);
        models = res.data.pins.map(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
      });
      return models;
    } finally {
      this.isFetching = false;
    }
  };
  inNotebook = (notebookId: string) =>
    this.orderedData.filter((pin) => pin.notebookId === notebookId);
  @computed
  get home() {
    return this.orderedData.filter((pin) => !pin.notebookId);
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
