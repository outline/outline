// @flow
import invariant from "invariant";
import { sortBy, filter, find } from "lodash";
import { action, computed } from "mobx";
import Share from "models/Share";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import { client } from "utils/ApiClient";

export default class SharesStore extends BaseStore<Share> {
  actions = ["info", "list", "create", "update"];

  constructor(rootStore: RootStore) {
    super(rootStore, Share);
  }

  @computed
  get orderedData(): Share[] {
    return sortBy(Array.from(this.data.values()), "createdAt").reverse();
  }

  @computed
  get published(): Share[] {
    return filter(this.orderedData, (share) => share.published);
  }

  @action
  revoke = async (share: Share) => {
    await client.post("/shares.revoke", { id: share.id });
    this.remove(share.id);
  };

  @action
  async create(params: Object) {
    let item = this.getByDocumentId(params.documentId);
    if (item) return item;

    return super.create(params);
  }

  @action
  async fetch(documentId: string, options?: Object = {}): Promise<*> {
    let item = this.getByDocumentId(documentId);
    if (item && !options.force) return item;

    this.isFetching = true;

    try {
      const res = await client.post(`/${this.modelName}s.info`, { documentId });
      invariant(res && res.data, "Data should be available");

      this.addPolicies(res.policies);
      return this.add(res.data);
    } finally {
      this.isFetching = false;
    }
  }

  getByDocumentId = (documentId): ?Share => {
    return find(this.orderedData, (share) => share.documentId === documentId);
  };
}
