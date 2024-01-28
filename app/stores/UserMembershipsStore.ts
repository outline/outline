import invariant from "invariant";
import { action, runInAction, computed } from "mobx";
import UserMembership from "~/models/UserMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, { PAGINATION_SYMBOL, RPCAction } from "./base/Store";

export default class UserMembershipsStore extends Store<UserMembership> {
  actions = [
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Delete,
    RPCAction.Update,
  ];

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

      return runInAction(`UserMembershipsStore#fetchPage`, () => {
        res.data.documents.forEach(this.rootStore.documents.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
        return res.data.memberships.map(this.add);
      });
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchDocumentMemberships = async (
    params: (PaginationParams & { id: string }) | undefined
  ): Promise<UserMembership[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.memberships`, params);
      invariant(res?.data, "Data not available");

      return runInAction(`MembershipsStore#fetchDocmentMemberships`, () => {
        res.data.users.forEach(this.rootStore.users.add);

        const response = res.data.memberships.map(this.add);
        this.isLoaded = true;

        response[PAGINATION_SYMBOL] = res.pagination;
        return response;
      });
    } finally {
      this.isFetching = false;
    }
  };

  @action
  async create({ documentId, userId, permission }: Partial<UserMembership>) {
    const res = await client.post("/documents.add_user", {
      id: documentId,
      userId,
      permission,
    });

    return runInAction(`UserMembershipsStore#create`, () => {
      invariant(res?.data, "Membership data should be available");
      res.data.users.forEach(this.rootStore.users.add);

      const memberships = res.data.memberships.map(this.add);
      return memberships[0];
    });
  }

  @action
  async delete({ documentId, userId }: UserMembership) {
    await client.post("/documents.remove_user", {
      id: documentId,
      userId,
    });
    this.removeAll({ userId, documentId });
  }

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
