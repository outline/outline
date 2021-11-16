import invariant from "invariant";
import { action, runInAction } from "mobx";
import Membership from "models/Membership";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { PaginationParams } from "types";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/ApiClient' or its corres... Remove this comment to see the full error message
import { client } from "utils/ApiClient";

export default class MembershipsStore extends BaseStore<Membership> {
  // @ts-expect-error ts-migrate(2416) FIXME: Property 'actions' in type 'MembershipsStore' is n... Remove this comment to see the full error message
  actions = ["create", "delete"];

  constructor(rootStore: RootStore) {
    super(rootStore, Membership);
  }

  @action
  fetchPage = async (
    params: PaginationParams | null | undefined
  ): Promise<any> => {
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
  // @ts-expect-error ts-migrate(2416) FIXME: Property 'create' in type 'MembershipsStore' is no... Remove this comment to see the full error message
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
    invariant(res && res.data, "Membership data should be available");
    res.data.users.forEach(this.rootStore.users.add);
    res.data.memberships.forEach(this.add);
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
