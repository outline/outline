import invariant from "invariant";
import { action, makeObservable, override, runInAction } from "mobx";
import UserMembership from "~/models/UserMembership";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import IndexedStore from "./base/IndexedStore";
import type RootStore from "./RootStore";
import { type PaginatedResponse, RPCAction } from "./base/Store";

export default class UserMembershipsStore extends IndexedStore<UserMembership> {
  actions = [
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Delete,
    RPCAction.Update,
  ];

  responseKey = "memberships";

  constructor(rootStore: RootStore) {
    super(rootStore, UserMembership);
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
    params?: PaginationParams
  ): Promise<PaginatedResponse<UserMembership>> =>
    this.fetchPaginated("/userMemberships.list", params, [
      this.rootStore.documents,
    ]);

  @action
  fetchDocumentMemberships = async (
    params: (PaginationParams & { id: string }) | undefined
  ): Promise<PaginatedResponse<UserMembership>> =>
    this.fetchPaginated("/documents.memberships", params, [
      this.rootStore.users,
    ]);

  @override
  async create({ documentId, userId, permission }: Partial<UserMembership>) {
    const res = await client.post("/documents.add_user", {
      id: documentId,
      userId,
      permission,
    });

    return runInAction(() => {
      invariant(res?.data, "Membership data should be available");
      res.data.users.forEach(this.rootStore.users.add);

      const memberships = res.data.memberships.map(this.add);
      return memberships[0];
    });
  }

  @override
  async delete({ documentId, userId }: UserMembership) {
    await client.post("/documents.remove_user", {
      id: documentId,
      userId,
    });
    this.removeAll({ userId, documentId });
  }

  /**
   * Returns the user membership associated with the document.
   */
  getByDocumentId = (documentId: string): UserMembership | undefined => {
    const membership = this.find({ documentId });

    if (membership) {
      return membership;
    }

    const document = this.rootStore.documents.get(documentId);
    return document?.parentDocumentId
      ? this.getByDocumentId(document.parentDocumentId)
      : undefined;
  };
}
