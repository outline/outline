import invariant from "invariant";
import { isUndefined, orderBy } from "es-toolkit/compat";
import { action, computed, makeObservable, observable, override } from "mobx";
import type { NavigationNode, PublicTeam } from "@shared/types";
import type Document from "~/models/Document";
import Share from "~/models/Share";
import type User from "~/models/User";
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
    makeObservable(this);
  }

  @override
  get orderedData(): Share[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "asc");
  }

  @computed
  get published(): Share[] {
    return this.orderedData.filter((share) => share.published);
  }

  @action
  revoke = async (share: Share) => {
    await client.post("/shares.revoke", {
      id: share.id,
    });
    this.remove(share.id);
  };

  @override
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

  @override
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

    // shares received over websockets do not include a policy.
    if (share && this.rootStore.policies.get(share.id)) {
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

  /**
   * Returns the shares to list in settings that match the query, as filtered
   * by the shares.list endpoint: published shares created by the user, or all
   * published shares for an admin. Shares without a loaded policy are left out.
   *
   * @param query the search query.
   * @param user the current user.
   * @returns the matching shares.
   */
  findListedByQuery = (query: string, user: User): Share[] =>
    this.findByQuery(query).filter(
      (share) =>
        share.published &&
        !!this.rootStore.policies.get(share.id) &&
        (user.isAdmin || share.createdBy?.id === user.id)
    );

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

  getByCollectionId = (collectionId: string): Share | undefined =>
    this.orderedData.find((share) => share.collectionId === collectionId);

  getByDocumentId = (documentId: string): Share | undefined =>
    this.orderedData.find((share) => share.documentId === documentId);

  get(id: string): Share | undefined {
    return id
      ? (this.data.get(id) ??
          this.orderedData.find((share) => share.urlId === id))
      : undefined;
  }
}
