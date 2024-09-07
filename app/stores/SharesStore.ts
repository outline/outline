import invariant from "invariant";
import filter from "lodash/filter";
import find from "lodash/find";
import isUndefined from "lodash/isUndefined";
import orderBy from "lodash/orderBy";
import { action, computed } from "mobx";
import type { Required } from "utility-types";
import type { JSONObject } from "@shared/types";
import Share from "~/models/Share";
import type { Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class SharesStore extends Store<Share> {
  actions = [
    RPCAction.Info,
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Update,
  ];

  constructor(rootStore: RootStore) {
    super(rootStore, Share);
  }

  @computed
  get orderedData(): Share[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "asc");
  }

  @computed
  get published(): Share[] {
    return filter(this.orderedData, (share) => share.published);
  }

  @action
  revoke = async (share: Share) => {
    await client.post("/shares.revoke", {
      id: share.id,
    });
    this.remove(share.id);
  };

  @action
  async create(params: Required<Properties<Share>, "documentId">) {
    const item = this.getByDocumentId(params.documentId);
    if (item) {
      return item;
    }
    return super.create(params);
  }

  @action
  async fetch(documentId: string, options: JSONObject = {}): Promise<any> {
    const item = this.getByDocumentId(documentId);
    if (item && !options.force) {
      return item;
    }
    this.isFetching = true;

    try {
      const res = await client.post(`/${this.apiEndpoint}.info`, {
        documentId,
      });

      if (isUndefined(res)) {
        return;
      }
      invariant(res?.data, "Data should be available");
      this.addPolicies(res.policies);
      return res.data.shares.map(this.add);
    } finally {
      this.isFetching = false;
    }
  }

  getByDocumentParents = (documentId: string): Share | undefined => {
    const document = this.rootStore.documents.get(documentId);
    if (!document) {
      return;
    }

    const collection = document.collectionId
      ? this.rootStore.collections.get(document.collectionId)
      : undefined;
    if (!collection) {
      return;
    }

    const parentIds = collection
      .pathToDocument(documentId)
      .slice(0, -1)
      .map((p) => p.id);

    for (const parentId of parentIds) {
      const share = this.getByDocumentId(parentId);

      if (share?.includeChildDocuments && share.published) {
        return share;
      }
    }

    return undefined;
  };

  getByCollectionId = (collectionId: string): Share | null | undefined =>
    find(this.orderedData, (share) => share.collectionId === collectionId);

  getByDocumentId = (documentId: string): Share | null | undefined =>
    find(this.orderedData, (share) => share.documentId === documentId);
}
