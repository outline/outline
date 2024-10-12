import invariant from "invariant";
import { action, runInAction } from "mobx";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import GroupMembership from "~/models/GroupMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, {
  PAGINATION_SYMBOL,
  PaginatedResponse,
  RPCAction,
} from "./base/Store";

export default class GroupMembershipsStore extends Store<GroupMembership> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, GroupMembership);
  }

  @action
  fetchPage = async ({
    collectionId,
    documentId,
    ...params
  }:
    | PaginationParams & {
        documentId?: string;
        collectionId?: string;
        groupId?: string;
      }): Promise<PaginatedResponse<GroupMembership>> => {
    this.isFetching = true;

    try {
      const res = collectionId
        ? await client.post(`/collections.group_memberships`, {
            id: collectionId,
            ...params,
          })
        : documentId
        ? await client.post(`/documents.group_memberships`, {
            id: documentId,
            ...params,
          })
        : await client.post(`/groupMemberships.list`, params);
      invariant(res?.data, "Data not available");

      let response: PaginatedResponse<GroupMembership> = [];
      runInAction(`GroupMembershipsStore#fetchPage`, () => {
        res.data.groups?.forEach(this.rootStore.groups.add);
        res.data.documents?.forEach(this.rootStore.documents.add);
        response = res.data.groupMemberships.map(this.add);
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

  @action
  async delete({
    collectionId,
    documentId,
    groupId,
  }: {
    collectionId?: string;
    documentId?: string;
    groupId: string;
  }) {
    collectionId
      ? await client.post("/collections.remove_group", {
          id: collectionId,
          groupId,
        })
      : await client.post("/documents.remove_group", {
          id: documentId,
          groupId,
        });

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
}
