// @flow
import invariant from "invariant";
import { sortBy, filter, find, isUndefined } from "lodash";
import { action, computed } from "mobx";
import Share from "models/Share";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import { client } from "utils/ApiClient";

export default class SharesStore extends BaseStore<Share> {
  actions = ["info", "list", "create", "update"];

  constructor(rootStore: RootStore) {
    super(rootStore, Share);
  }

  @computed
  get orderedData(): Share[] {
    return sortBy(Array.from(this.data.values()), "createdAt").reverse();
  }

  @computed
  get published(): Share[] {
    return filter(this.orderedData, (share) => share.published);
  }

  @action
  revoke = async (share: Share) => {
    await client.post("/shares.revoke", { id: share.id });
    this.remove(share.id);
  };

  @action
  async create(params: Object) {
    let item = this.getByDocumentId(params.documentId);
    if (item) return item;

    return super.create(params);
  }

  @action
  async fetch(documentId: string, options?: Object = {}): Promise<*> {
    let item = this.getByDocumentId(documentId);
    if (item && !options.force) return item;

    this.isFetching = true;

    try {
      const res = await client.post(`/${this.modelName}s.info`, {
        documentId,
        apiVersion: 2,
      });
      if (isUndefined(res)) return;

      invariant(res && res.data, "Data should be available");

      this.addPolicies(res.policies);
      return res.data.shares.map(this.add);
    } finally {
      this.isFetching = false;
    }
  }

  getByDocumentParents = (documentId: string): ?Share => {
    const document = this.rootStore.documents.get(documentId);
    if (!document) return;

    const collection = this.rootStore.collections.get(document.collectionId);
    if (!collection) return;

    const parentIds = collection
      .pathToDocument(documentId)
      .slice(0, -1)
      .map((p) => p.id);

    for (const parentId of parentIds) {
      const share = this.getByDocumentId(parentId);
      if (share && share.includeChildDocuments && share.published) {
        return share;
      }
    }
  };

  getByDocumentId = (documentId: string): ?Share => {
    return find(this.orderedData, (share) => share.documentId === documentId);
  };
}
