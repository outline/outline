// @flow
import { sortBy, filter, find } from "lodash";
import { action, computed } from "mobx";
import { client } from "utils/ApiClient";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import Share from "models/Share";

export default class SharesStore extends BaseStore<Share> {
  actions = ["list", "create", "update"];

  constructor(rootStore: RootStore) {
    super(rootStore, Share);
  }

  @computed
  get orderedData(): Share[] {
    return sortBy(Array.from(this.data.values()), "createdAt").reverse();
  }

  @computed
  get published(): Share[] {
    return filter(this.orderedData, d => d.published);
  }

  @action
  revoke = async (share: Share) => {
    await client.post("/shares.revoke", { id: share.id });
    this.remove(share.id);
  };

  getByDocumentId = (documentId): ?Share => {
    return find(this.orderedData, share => share.documentId === documentId);
  };
}
