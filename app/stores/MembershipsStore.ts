import invariant from "invariant";
import { action, runInAction } from "mobx";
import Membership from "~/models/Membership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class MembershipsStore extends BaseStore<Membership> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, Membership);
  }

  @action
  fetchPage = async (params: PaginationParams | undefined): Promise<any> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.memberships`, params);
      invariant(res?.data, "Data not available");
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
    collectionId: string;
    userId: string;
    permission: string;
  }) {
    const res = await client.post("/collections.add_user", {
      id: collectionId,
      userId,
      permission,
    });
    invariant(res?.data, "Membership data should be available");
    res.data.users.forEach(this.rootStore.users.add);

    const memberships = res.data.memberships.map(this.add);
    return memberships[0];
  }

  @action
  async delete({
    collectionId,
    userId,
  }: {
    collectionId: string;
    userId: string;
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
