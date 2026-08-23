import invariant from "invariant";
import { action, runInAction } from "mobx";
import { type NotebookPermission, type NotePermission } from "@shared/types";
import GroupMembership from "~/models/GroupMembership";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store, {
  PAGINATION_SYMBOL,
  type PaginatedResponse,
  RPCAction,
} from "./base/Store";
export default class GroupMembershipsStore extends Store<GroupMembership> {
  actions = [RPCAction.Create, RPCAction.Delete];
  constructor(rootStore: RootStore) {
    super(rootStore, GroupMembership);
  }
  /**
   * Remove a membership, and the access that it granted.
   *
   * @param id the ID of the membership to remove.
   */
  @action
  remove(
    id: string,
    options?: {
      permanent?: boolean;
    }
  ): void {
    super.remove(id, options);
    this.rootStore.policies.removeForMembership(id);
  }
  @action
  fetchPage = async ({
    notebookId,
    noteId,
    ...params
  }: PaginationParams & {
    noteId?: string;
    notebookId?: string;
    groupId?: string;
  }): Promise<PaginatedResponse<GroupMembership>> => {
    this.isFetching = true;
    try {
      const res = notebookId
        ? await client.post(`/collections.group_memberships`, {
            id: notebookId,
            ...params,
          })
        : noteId
          ? await client.post(`/documents.group_memberships`, {
              id: noteId,
              ...params,
            })
          : await client.post(`/groupMemberships.list`, params);
      invariant(res?.data, "Data not available");
      let response: PaginatedResponse<GroupMembership> = [];
      runInAction(`GroupMembershipsStore#fetchPage`, () => {
        res.data.groups?.forEach(this.rootStore.groups.add);
        res.data.documents?.forEach(this.rootStore.notes.add);
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
    notebookId,
    noteId,
    groupId,
    permission,
  }: {
    notebookId?: string;
    noteId?: string;
    groupId: string;
    permission?: NotebookPermission | NotePermission;
  }) {
    const res = notebookId
      ? await client.post("/collections.add_group", {
          id: notebookId,
          groupId,
          permission,
        })
      : await client.post("/documents.add_group", {
          id: noteId,
          groupId,
          permission,
        });
    invariant(res?.data, "Membership data should be available");
    const cgm = res.data.groupMemberships.map(this.add);
    return cgm[0];
  }
  @action
  async delete({
    notebookId,
    noteId,
    groupId,
  }: {
    notebookId?: string;
    noteId?: string;
    groupId: string;
  }) {
    if (notebookId) {
      await client.post("/collections.remove_group", {
        id: notebookId,
        groupId,
      });
    } else {
      await client.post("/documents.remove_group", {
        id: noteId,
        groupId,
      });
    }
    this.removeAll(
      notebookId
        ? {
            notebookId,
            groupId,
          }
        : {
            noteId,
            groupId,
          }
    );
  }
  /**
   * Returns all group memberships for the given notebook
   *
   * @param collectionId The collection ID
   * @returns A list of group memberships
   */
  inNotebook = (notebookId: string) =>
    this.orderedData.filter((cgm) => cgm.notebookId === notebookId);
  /**
   * Returns all group memberships for the given note
   *
   * @param noteId The note ID
   * @returns A list of group memberships
   */
  inNote = (noteId: string) =>
    this.orderedData.filter((cgm) => cgm.noteId === noteId);
  /**
   * Returns the group membership associated with the note.
   */
  getByNoteId = (noteId: string): GroupMembership | undefined => {
    const membership = this.find({ noteId });
    if (membership) {
      return membership;
    }
    const note = this.rootStore.notes.get(noteId);
    return note?.parentNoteId ? this.getByNoteId(note.parentNoteId) : undefined;
  };
}
