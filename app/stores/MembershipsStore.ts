import invariant from "invariant";
import { action, runInAction } from "mobx";
import type { NotebookPermission } from "@shared/types";
import Membership from "~/models/Membership";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store, {
  PAGINATION_SYMBOL,
  type PaginatedResponse,
  RPCAction,
} from "./base/Store";
export default class MembershipsStore extends Store<Membership> {
  actions = [RPCAction.Create, RPCAction.Delete];
  constructor(rootStore: RootStore) {
    super(rootStore, Membership);
  }
  /**
   * Remove a membership, and the access that it granted.
   *
   * @param id the ID of the membership to remove.
   */
  @action
  remove(
    id: string,
    options?: {
      permanent?: boolean;
    }
  ): void {
    super.remove(id, options);
    this.rootStore.policies.removeForMembership(id);
  }
  @action
  fetchPage = async (
    params:
      | (PaginationParams & {
          id?: string;
        })
      | undefined
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
    notebookId,
    userId,
    permission,
  }: {
    notebookId: string;
    userId: string;
    permission?: NotebookPermission;
  }) {
    const res = await client.post("/collections.add_user", {
      id: notebookId,
      userId,
      permission,
    });
    invariant(res?.data, "Membership data should be available");
    res.data.users.forEach(this.rootStore.users.add);
    const memberships = res.data.memberships.map(this.add);
    return memberships[0];
  }
  @action
  async delete({ notebookId, userId }: { notebookId: string; userId: string }) {
    await client.post("/collections.remove_user", {
      id: notebookId,
      userId,
    });
    this.removeAll({ userId, notebookId });
  }
  @action
  removeNotebookMemberships = (notebookId: string) => {
    this.data.forEach((membership, key) => {
      if (membership.notebookId === notebookId) {
        this.remove(key);
      }
    });
  };
  inNotebook = (notebookId: string) =>
    this.orderedData.filter(
      (membership) => membership.notebookId === notebookId
    );
}
