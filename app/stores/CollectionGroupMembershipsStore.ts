import invariant from "invariant";
import { action, runInAction } from "mobx";
import CollectionGroupMembership from "~/models/CollectionGroupMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class CollectionGroupMembershipsStore extends BaseStore<
  CollectionGroupMembership
> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, CollectionGroupMembership);
  }

  @action
  fetchPage = async (params: PaginationParams | undefined): Promise<any> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.group_memberships`, params);
      invariant(res?.data, "Data not available");
      runInAction(`CollectionGroupMembershipsStore#fetchPage`, () => {
        res.data.groups.forEach(this.rootStore.groups.add);
        res.data.collectionGroupMemberships.forEach(this.add);
        this.isLoaded = true;
      });
      return res.data.groups;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  async create({
    collectionId,
    groupId,
    permission,
  }: {
    collectionId: string;
    groupId: string;
    permission: string;
  }) {
    const res = await client.post("/collections.add_group", {
      id: collectionId,
      groupId,
      permission,
    });
    invariant(res?.data, "Membership data should be available");

    const cgm = res.data.collectionGroupMemberships.map(this.add);
    return cgm[0];
  }

  @action
  async delete({
    collectionId,
    groupId,
  }: {
    collectionId: string;
    groupId: string;
  }) {
    await client.post("/collections.remove_group", {
      id: collectionId,
      groupId,
    });
    this.remove(`${groupId}-${collectionId}`);
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
