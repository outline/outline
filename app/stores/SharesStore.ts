import invariant from "invariant";
import filter from "lodash/filter";
import find from "lodash/find";
import isUndefined from "lodash/isUndefined";
import orderBy from "lodash/orderBy";
import { action, computed, observable } from "mobx";
import type { NavigationNode, PublicTeam } from "@shared/types";
import Document from "~/models/Document";
import Share from "~/models/Share";
import type { PartialExcept } from "~/types";
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

  @observable
  sharedCache: Map<
    string,
    { sharedTree: NavigationNode | null; team: PublicTeam } | undefined
  > = new Map();

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
  async create(
    params:
      | (PartialExcept<Share, "collectionId"> & { type: "collection" })
      | (PartialExcept<Share, "documentId"> & { type: "document" })
  ): Promise<Share> {
    const item =
      params.type === "collection"
        ? this.getByCollectionId(params.collectionId)
        : this.getByDocumentId(params.documentId);

    if (item) {
      return item;
    }

    return super.create(params);
  }

  @action
  async fetch(id: string) {
    const share = this.get(id);
    const cache = this.sharedCache.get(id);
    if (share && cache) {
      return share;
    }

    this.isFetching = true;
    try {
      const res = await client.post(`/${this.apiEndpoint}.info`, {
        id,
      });
      invariant(res?.data, "Data should be available");

      res.data.shares.map(this.add);

      if (res.data.collection) {
        this.rootStore.collections.add(res.data.collection);
      }

      if (res.data.document) {
        this.rootStore.documents.add(res.data.document);
      }

      this.sharedCache.set(id, {
        sharedTree: res.data.sharedTree,
        team: res.data.team,
      });
      this.addPolicies(res.policies);

      return this.data.get(id)!;
    } finally {
      this.isFetching = false;
    }
  }

  @action
  async fetchOne(params: { documentId: string } | { collectionId: string }) {
    const share =
      "collectionId" in params
        ? this.getByCollectionId(params.collectionId)
        : this.getByDocumentId(params.documentId);
    if (share) {
      return share;
    }
    this.isFetching = true;

    try {
      const res = await client.post(`/${this.apiEndpoint}.info`, params);

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

  getByDocumentParents = (document: Document): Share | undefined => {
    const collectionShare = document.collectionId
      ? this.getByCollectionId(document.collectionId)
      : undefined;

    if (collectionShare?.published) {
      return collectionShare;
    }

    const collection = document.collectionId
      ? this.rootStore.collections.get(document.collectionId)
      : undefined;
    if (!collection) {
      return;
    }

    const parentIds = collection
      .pathToDocument(document.id)
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

  get(id: string): Share | undefined {
    return (
      this.data.get(id) ??
      this.orderedData.find((share) => id.endsWith(share.urlId))
    );
  }
}
