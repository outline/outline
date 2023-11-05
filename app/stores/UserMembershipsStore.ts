import invariant from "invariant";
import { action, runInAction, computed } from "mobx";
import UserMembership from "~/models/UserMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class UserMembershipsStore extends Store<UserMembership> {
  constructor(rootStore: RootStore) {
    super(rootStore, UserMembership);
  }

  @action
  fetchPage = async (
    params?: PaginationParams | undefined
  ): Promise<UserMembership[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/userMemberships.list`, params);
      invariant(res?.data, "Data not available");

      let models: UserMembership[] = [];
      runInAction(`UserMembershipsStore#fetchPage`, () => {
        res.data.documents.forEach(this.rootStore.documents.add);
        models = res.data.memberships.map(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
      });
      return models;
    } finally {
      this.isFetching = false;
    }
  };

  @computed
  get orderedData(): UserMembership[] {
    const memberships = Array.from(this.data.values());

    return memberships.sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }

      return a.index < b.index ? -1 : 1;
    });
  }
}
