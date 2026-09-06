import invariant from "invariant";
import { override } from "mobx";
import {
  type CollectionPermission,
  type DocumentPermission,
} from "@shared/types";
import GroupMembership from "~/models/GroupMembership";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store, { type PaginatedResponse, RPCAction } from "./base/Store";

export default class GroupMembershipsStore extends Store<GroupMembership> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, GroupMembership);
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

  fetchPage = async ({
    collectionId,
    documentId,
    ...params
  }: PaginationParams & {
    documentId?: string;
    collectionId?: string;
    groupId?: string;
  }): Promise<PaginatedResponse<GroupMembership>> => {
    const [endpoint, body] = collectionId
      ? ["/collections.group_memberships", { id: collectionId, ...params }]
      : documentId
        ? ["/documents.group_memberships", { id: documentId, ...params }]
        : ["/groupMemberships.list", params];

    return this.fetchPaginated(endpoint, body, [
      this.rootStore.groups,
      this.rootStore.documents,
    ]);
  };

  @override
  async create({
    collectionId,
    documentId,
    groupId,
    permission,
  }: {
    collectionId?: string;
    documentId?: string;
    groupId: string;
    permission?: CollectionPermission | DocumentPermission;
  }) {
    const res = collectionId
      ? await client.post("/collections.add_group", {
          id: collectionId,
          groupId,
          permission,
        })
      : await client.post("/documents.add_group", {
          id: documentId,
          groupId,
          permission,
        });
    invariant(res?.data, "Membership data should be available");

    const cgm = res.data.groupMemberships.map(this.add);
    return cgm[0];
  }

  @override
  async delete({
    collectionId,
    documentId,
    groupId,
  }: {
    collectionId?: string;
    documentId?: string;
    groupId: string;
  }) {
    if (collectionId) {
      await client.post("/collections.remove_group", {
        id: collectionId,
        groupId,
      });
    } else {
      await client.post("/documents.remove_group", {
        id: documentId,
        groupId,
      });
    }

    this.removeAll(
      collectionId
        ? {
            collectionId,
            groupId,
          }
        : {
            documentId,
            groupId,
          }
    );
  }

  /**
   * Returns all group memberships for the given collection
   *
   * @param collectionId The collection ID
   * @returns A list of group memberships
   */
  inCollection = (collectionId: string) =>
    this.orderedData.filter((cgm) => cgm.collectionId === collectionId);

  /**
   * Returns all group memberships for the given document
   *
   * @param documentId The document ID
   * @returns A list of group memberships
   */
  inDocument = (documentId: string) =>
    this.orderedData.filter((cgm) => cgm.documentId === documentId);

  /**
   * Returns the group membership associated with the document.
   */
  getByDocumentId = (documentId: string): GroupMembership | undefined => {
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
