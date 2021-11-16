import invariant from "invariant";
import { action, runInAction } from "mobx";
import CollectionGroupMembership from "models/CollectionGroupMembership";
import { PaginationParams } from "../types";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/ApiClient' or its corres... Remove this comment to see the full error message
import { client } from "utils/ApiClient";

export default class CollectionGroupMembershipsStore extends BaseStore<
  CollectionGroupMembership
> {
  // @ts-expect-error ts-migrate(2416) FIXME: Property 'actions' in type 'CollectionGroupMembers... Remove this comment to see the full error message
  actions = ["create", "delete"];

  constructor(rootStore: RootStore) {
    super(rootStore, CollectionGroupMembership);
  }

  @action
  fetchPage = async (
    params: PaginationParams | null | undefined
  ): Promise<any> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.group_memberships`, params);
      invariant(res && res.data, "Data not available");
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
  // @ts-expect-error ts-migrate(2416) FIXME: Property 'create' in type 'CollectionGroupMembersh... Remove this comment to see the full error message
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
    invariant(res && res.data, "Membership data should be available");
    res.data.collectionGroupMemberships.forEach(this.add);
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
