import invariant from "invariant";
import { action, runInAction, computed } from "mobx";
import UserMembership from "~/models/UserMembership";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
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
  fetchPage = async (params?: PaginationParams): Promise<UserMembership[]> => {
    this.isFetching = true;
    try {
      const res = await client.post(`/userMemberships.list`, params);
      invariant(res?.data, "Data not available");
      return runInAction(`UserMembershipsStore#fetchPage`, () => {
        res.data.documents.forEach(this.rootStore.notes.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
        return res.data.memberships.map(this.add);
      });
    } finally {
      this.isFetching = false;
    }
  };
  @action
  fetchNoteMemberships = async (
    params:
      | (PaginationParams & {
          id: string;
        })
      | undefined
  ): Promise<UserMembership[]> => {
    this.isFetching = true;
    try {
      const res = await client.post(`/documents.memberships`, params);
      invariant(res?.data, "Data not available");
      return runInAction(`MembershipsStore#fetchNoteMemberships`, () => {
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
  async create({ noteId, userId, permission }: Partial<UserMembership>) {
    const res = await client.post("/documents.add_user", {
      id: noteId,
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
  async delete({ noteId, userId }: UserMembership) {
    await client.post("/documents.remove_user", {
      id: noteId,
      userId,
    });
    this.removeAll({ userId, noteId });
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
  /**
   * Returns the user membership associated with the note.
   */
  getByNoteId = (noteId: string): UserMembership | undefined => {
    const membership = this.find({ noteId });
    if (membership) {
      return membership;
    }
    const note = this.rootStore.notes.get(noteId);
    return note?.parentNoteId ? this.getByNoteId(note.parentNoteId) : undefined;
  };
}
