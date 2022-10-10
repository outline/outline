import invariant from "invariant";
import { action, runInAction } from "mobx";
import { DocumentPermission } from "@shared/types";
import DocumentMembership from "~/models/DocumentMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import BaseStore, { PAGINATION_SYMBOL, RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class DocumentMembershipsStore extends BaseStore<
  DocumentMembership
> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, DocumentMembership);
  }

  @action
  fetchPage = async (
    params: PaginationParams | undefined
  ): Promise<DocumentMembership[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.memberships`, params);
      invariant(res?.data, "Data not available");

      let response: DocumentMembership[] = [];
      runInAction(`DocumentMembershipsStore#fetchPage`, () => {
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
    documentId,
    userId,
    permission,
  }: {
    documentId: string;
    userId: string;
    permission?: DocumentPermission;
  }) {
    const res = await client.post("/documents.add_user", {
      id: documentId,
      userId,
      permission,
    });
    invariant(res?.data, "Membership data should be available");
    res.data.users.forEach(this.rootStore.users.add);

    const memberships = res.data.memberships.map(this.add);
    return memberships[0];
  }

  @action
  async delete({ documentId, userId }: { documentId: string; userId: string }) {
    await client.post("/documents.remove_user", {
      id: documentId,
      userId,
    });
    this.remove(`${userId}-${documentId}`);
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
