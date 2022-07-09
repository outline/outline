import invariant from "invariant";
import { sortBy, filter, find, isUndefined } from "lodash";
import { action, computed } from "mobx";
import Share from "~/models/Share";
import { client } from "~/utils/ApiClient";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class SharesStore extends BaseStore<Share> {
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
    return sortBy(Array.from(this.data.values()), "createdAt").reverse();
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
  async create(params: Record<string, any>) {
    const item = this.getByDocumentId(params.documentId);
    if (item) {
      return item;
    }
    return super.create(params);
  }

  @action
  async fetch(
    documentId: string,
    options: Record<string, any> = {}
  ): Promise<any> {
    const item = this.getByDocumentId(documentId);
    if (item && !options.force) {
      return item;
    }
    this.isFetching = true;

    try {
      const res = await client.post(`/${this.modelName}s.info`, {
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

  getByDocumentParents = (documentId: string): Share | null | undefined => {
    const document = this.rootStore.documents.get(documentId);
    if (!document) {
      return;
    }

    const collection = this.rootStore.collections.get(document.collectionId);
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

  getByDocumentId = (documentId: string): Share | null | undefined => {
    return find(this.orderedData, (share) => share.documentId === documentId);
  };
}
