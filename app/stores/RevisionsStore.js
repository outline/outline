// @flow
import invariant from "invariant";
import { filter } from "lodash";
import { action, runInAction } from "mobx";
import BaseStore from "stores/BaseStore";
import RootStore from "stores/RootStore";
import Revision from "models/Revision";
import type { FetchOptions, PaginationParams } from "types";
import { client } from "utils/ApiClient";

export default class RevisionsStore extends BaseStore<Revision> {
  actions = ["list"];

  constructor(rootStore: RootStore) {
    super(rootStore, Revision);
  }

  getDocumentRevisions(documentId: string): Revision[] {
    return filter(this.orderedData, { documentId });
  }

  @action
  fetch = async (id: string, options?: FetchOptions): Promise<?Revision> => {
    this.isFetching = true;
    invariant(id, "Id is required");

    try {
      const rev = this.data.get(id);
      if (rev) return rev;

      const res = await client.post("/revisions.info", {
        id,
      });
      invariant(res && res.data, "Revision not available");
      this.add(res.data);

      runInAction("RevisionsStore#fetch", () => {
        this.isLoaded = true;
      });

      return this.data.get(res.data.id);
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchPage = async (options: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post("/revisions.list", options);
      invariant(res && res.data, "Document revisions not available");
      runInAction("RevisionsStore#fetchPage", () => {
        res.data.forEach((revision) => this.add(revision));
        this.isLoaded = true;
      });
      return res.data;
    } finally {
      this.isFetching = false;
    }
  };
}
