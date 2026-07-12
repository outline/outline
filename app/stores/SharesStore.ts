import invariant from "invariant";
import { filter, isUndefined, orderBy } from "es-toolkit/compat";
import { action, computed, observable } from "mobx";
import {
  ShareTypes,
  type NavigationNode,
  type PublicTeam,
} from "@shared/types";
import type Document from "~/models/Document";
import Share from "~/models/Share";
import type { PartialExcept } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
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

  @computed
  get unpublished(): Share[] {
    return filter(this.orderedData, (share) => !share.published);
  }

  @computed
  get web(): Share[] {
    return filter(this.orderedData, (share) => share.type === ShareTypes.Web);
  }

  @computed
  get private(): Share[] {
    return filter(
      this.orderedData,
      (share) => share.type === ShareTypes.Private
    );
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
      | (PartialExcept<Share, "collectionId"> & { targetType: "collection" })
      | (PartialExcept<Share, "documentId"> & { targetType: "document" })
  ): Promise<Share> {
    if (params.type === ShareTypes.Web) {
      const item =
        params.targetType === "collection"
          ? this.getByCollectionId(params.collectionId)
          : this.getByDocumentId(params.documentId);

      if (item) {
        return item;
      }
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
        ? this.getWebByCollectionId(params.collectionId)
        : this.getWebByDocumentId(params.documentId);
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
      ? this.getWebByCollectionId(document.collectionId)
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
      const share = this.getWebByDocumentId(parentId);

      if (share?.includeChildDocuments && share.published) {
        return share;
      }
    }

    return undefined;
  };

  getAllByCollectionId = (collectionId: string): Share[] =>
    filter(this.orderedData, (share) => share.collectionId === collectionId);

  getAllByDocumentId = (documentId: string): Share[] =>
    filter(this.orderedData, (share) => share.documentId === documentId);

  getPublishedByCollectionId = (collectionId: string): Share[] =>
    filter(this.getAllByCollectionId(collectionId), (share) => share.published);

  getPublishedByDocumentId = (documentId: string): Share[] =>
    filter(this.getAllByDocumentId(documentId), (share) => share.published);

  getUnpublishedByCollectionId = (collectionId: string): Share[] =>
    filter(
      this.getAllByCollectionId(collectionId),
      (share) => !share.published
    );

  getUnpublishedByDocumentId = (documentId: string): Share[] =>
    filter(this.getAllByDocumentId(documentId), (share) => !share.published);

  getPrivateByCollectionId = (
    collectionId: string,
    published = true
  ): Share[] =>
    filter(
      this.getAllByCollectionId(collectionId),
      (share) =>
        share.type === ShareTypes.Private && share.published === published
    );

  getPrivateByDocumentId = (documentId: string, published = true): Share[] =>
    filter(
      this.getAllByDocumentId(documentId),
      (share) =>
        share.type === ShareTypes.Private && share.published === published
    );

  getWebByCollectionId = (
    collectionId: string,
    published = true
  ): Share | undefined =>
    this.getAllByCollectionId(collectionId).find(
      (share) => share.type === ShareTypes.Web && share.published === published
    );

  getWebByDocumentId = (
    documentId: string,
    published = true
  ): Share | undefined =>
    this.getAllByDocumentId(documentId).find(
      (share) => share.type === ShareTypes.Web && share.published === published
    );

  getByCollectionId = (collectionId: string): Share | null | undefined =>
    this.getWebByCollectionId(collectionId) ??
    this.getPublishedByCollectionId(collectionId).at(-1) ??
    this.getAllByCollectionId(collectionId).at(-1);

  getByDocumentId = (documentId: string): Share | null | undefined =>
    this.getWebByDocumentId(documentId) ??
    this.getPublishedByDocumentId(documentId).at(-1) ??
    this.getAllByDocumentId(documentId).at(-1);

  get(id: string): Share | undefined {
    return id
      ? (this.data.get(id) ??
          this.orderedData.find((share) => id.endsWith(share.urlId)))
      : undefined;
  }
}
