import invariant from "invariant";
import { action, makeObservable, override } from "mobx";
import type { CollectionPermission } from "@shared/types";
import Membership from "~/models/Membership";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store, { type PaginatedResponse, RPCAction } from "./base/Store";

export default class MembershipsStore extends Store<Membership> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, Membership);
    makeObservable(this);
  }

  /**
   * Remove a membership, and the access that it granted.
   *
   * @param id the ID of the membership to remove.
   */
  @override
  remove(id: string, options?: { permanent?: boolean }): void {
    super.remove(id, options);
    this.rootStore.policies.removeForMembership(id);
  }

  fetchPage = async (
    params: (PaginationParams & { id?: string }) | undefined
  ): Promise<PaginatedResponse<Membership>> =>
    this.fetchPaginated("/collections.memberships", params, [
      this.rootStore.users,
    ]);

  @override
  async create({
    collectionId,
    userId,
    permission,
    owner,
  }: {
    collectionId: string;
    userId: string;
    permission?: CollectionPermission;
    owner?: boolean;
  }) {
    const res = await client.post("/collections.add_user", {
      id: collectionId,
      userId,
      permission,
      owner,
    });
    invariant(res?.data, "Membership data should be available");
    res.data.users.forEach(this.rootStore.users.add);
    res.data.collections?.forEach(this.rootStore.collections.add);

    const memberships = res.data.memberships.map(this.add);
    return memberships[0];
  }

  @override
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

    // Removing access also removes the user from the owners on the server.
    const collection = this.rootStore.collections.get(collectionId);
    if (collection?.ownerIds.includes(userId)) {
      collection.updateData({
        ownerIds: collection.ownerIds.filter((id) => id !== userId),
      });
    }
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
