import invariant from "invariant";
import { filter, find, isUndefined, orderBy } from "es-toolkit/compat";
import { action, computed, observable } from "mobx";
import type { NavigationNode, PublicTeam } from "@shared/types";
import type Note from "~/models/Note";
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
    | {
        sharedTree: NavigationNode | null;
        team: PublicTeam;
      }
    | undefined
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
      | (PartialExcept<Share, "notebookId"> & {
          type: "collection";
        })
      | (PartialExcept<Share, "noteId"> & {
          type: "document";
        })
  ): Promise<Share> {
    const item =
      params.type === "collection"
        ? this.getByNotebookId(params.notebookId)
        : this.getByNoteId(params.noteId);
    if (item) {
      return item;
    }
    if (params.type === "collection") {
      const { notebookId, ...rest } = params;
      const wireParams = {
        ...rest,
        collectionId: notebookId,
      };
      return super.create(wireParams);
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
        this.rootStore.notebooks.add(res.data.collection);
      }
      if (res.data.document) {
        this.rootStore.notes.add(res.data.document);
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
  async fetchOne(
    params:
      | {
          noteId: string;
        }
      | {
          notebookId: string;
        }
  ) {
    const share =
      "notebookId" in params
        ? this.getByNotebookId(params.notebookId)
        : this.getByNoteId(params.noteId);
    if (share) {
      return share;
    }
    this.isFetching = true;
    try {
      const wireParams =
        "notebookId" in params ? { collectionId: params.notebookId } : params;
      const res = await client.post(`/${this.apiEndpoint}.info`, wireParams);
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
  getByNoteParents = (note: Note): Share | undefined => {
    const notebookShare = note.notebookId
      ? this.getByNotebookId(note.notebookId)
      : undefined;
    if (notebookShare?.published) {
      return notebookShare;
    }
    const notebook = note.notebookId
      ? this.rootStore.notebooks.get(note.notebookId)
      : undefined;
    if (!notebook) {
      return;
    }
    const parentIds = notebook
      .pathToNote(note.id)
      .slice(0, -1)
      .map((p) => p.id);
    for (const parentId of parentIds) {
      const share = this.getByNoteId(parentId);
      if (share?.includeChildNotes && share.published) {
        return share;
      }
    }
    return undefined;
  };
  getByNotebookId = (notebookId: string): Share | null | undefined =>
    find(this.orderedData, (share) => share.notebookId === notebookId);
  getByNoteId = (noteId: string): Share | null | undefined =>
    find(this.orderedData, (share) => share.noteId === noteId);
  get(id: string): Share | undefined {
    return id
      ? (this.data.get(id) ??
          this.orderedData.find((share) => id.endsWith(share.urlId)))
      : undefined;
  }
}
