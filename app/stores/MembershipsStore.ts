import invariant from "invariant";
import { action, runInAction } from "mobx";
import { CollectionPermission } from "@shared/types";
import Membership from "~/models/Membership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, {
  PAGINATION_SYMBOL,
  PaginatedResponse,
  RPCAction,
} from "./base/Store";

export default class MembershipsStore extends Store<Membership> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, Membership);
  }

  @action
  fetchPage = async (
    params: (PaginationParams & { id?: string }) | undefined
  ): Promise<PaginatedResponse<Membership>> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/collections.memberships`, params);
      invariant(res?.data, "Data not available");

      let response: PaginatedResponse<Membership> = [];
      runInAction(`MembershipsStore#fetchPage`, () => {
        res.data.users.forEach(this.rootStore.users.add);
        response = res.data.memberships.map(this.add);
        this.isLoaded = true;
      });
      response[PAGINATION_SYMBOL] = res.pagination;
      return response;
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
    permission?: CollectionPermission;
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
    this.removeAll({ userId, collectionId });
  }

  @action
  removeCollectionMemberships = (collectionId: string) => {
    this.data.forEach((membership, key) => {
      if (membership.collectionId === collectionId) {
        this.remove(key);
      }
    });
  };

  inCollection = (collectionId: string) =>
    this.orderedData.filter(
      (membership) => membership.collectionId === collectionId
    );
}
