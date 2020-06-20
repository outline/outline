// @flow
import invariant from "invariant";
import { action, runInAction } from "mobx";
import { client } from "utils/ApiClient";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import Membership from "models/Membership";
import type { PaginationParams } from "types";

export default class MembershipsStore extends BaseStore<Membership> {
  actions = ["create", "delete"];

  constructor(rootStore: RootStore) {
    super(rootStore, Membership);
  }

  @action
  fetchPage = async (params: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.memberships`, params);

      invariant(res && res.data, "Data not available");

      runInAction(`/collections.memberships`, () => {
        res.data.users.forEach(this.rootStore.users.add);
        res.data.memberships.forEach(this.add);
        this.isLoaded = true;
      });
      return res.data.users;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  async create({
    collectionId,
    userId,
    permission,
  }: {
    collectionId: string,
    userId: string,
    permission: string,
  }) {
    const res = await client.post("/collections.add_user", {
      id: collectionId,
      userId,
      permission,
    });
    invariant(res && res.data, "Membership data should be available");

    res.data.users.forEach(this.rootStore.users.add);
    res.data.memberships.forEach(this.add);
  }

  @action
  async delete({
    collectionId,
    userId,
  }: {
    collectionId: string,
    userId: string,
  }) {
    await client.post("/collections.remove_user", {
      id: collectionId,
      userId,
    });

    this.remove(`${userId}-${collectionId}`);
  }

  @action
  removeCollectionMemberships = (collectionId: string) => {
    this.data.forEach((membership, key) => {
      if (key.includes(collectionId)) {
        this.remove(key);
      }
    });
  };
}
