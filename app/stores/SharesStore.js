// @flow
import { sortBy } from "lodash";
import { action, computed } from "mobx";
import { client } from "utils/ApiClient";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import Share from "models/Share";

export default class SharesStore extends BaseStore<Share> {
  actions = ["list", "create"];

  constructor(rootStore: RootStore) {
    super(rootStore, Share);
  }

  @computed
  get orderedData(): Share[] {
    return sortBy(Array.from(this.data.values()), "createdAt").reverse();
  }

  @action
  revoke = async (share: Share) => {
    await client.post("/shares.revoke", { id: share.id });
    this.remove(share.id);
  };
}
