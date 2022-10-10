import invariant from "invariant";
import { action, runInAction } from "mobx";
import { DocumentPermission } from "@shared/types";
import DocumentGroupMembership from "~/models/DocumentGroupMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import BaseStore, { PAGINATION_SYMBOL, RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class DocumentGroupMembershipsStore extends BaseStore<
  DocumentGroupMembership
> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, DocumentGroupMembership);
  }

  @action
  fetchPage = async (
    params: PaginationParams | undefined
  ): Promise<DocumentGroupMembership[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.group_memberships`, params);
      invariant(res?.data, "Data not available");

      let response: DocumentGroupMembership[] = [];
      runInAction(`DocumentGroupMembershipsStore#fetchPage`, () => {
        res.data.groups.forEach(this.rootStore.groups.add);
        response = res.data.documentGroupMemberships.map(this.add);
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
    documentId,
    groupId,
    permission,
  }: {
    documentId: string;
    groupId: string;
    permission?: DocumentPermission;
  }) {
    const res = await client.post("/documents.add_group", {
      id: documentId,
      groupId,
      permission,
    });
    invariant(res?.data, "Membership data should be available");

    const cgm = res.data.documentGroupMemberships.map(this.add);
    return cgm[0];
  }

  @action
  async delete({
    documentId,
    groupId,
  }: {
    documentId: string;
    groupId: string;
  }) {
    await client.post("/documents.remove_group", {
      id: documentId,
      groupId,
    });
    this.remove(`${groupId}-${documentId}`);
  }

  @action
  removeDocumentMemberships = (documentId: string) => {
    this.data.forEach((membership, key) => {
      if (key.includes(documentId)) {
        this.remove(key);
      }
    });
  };
}
