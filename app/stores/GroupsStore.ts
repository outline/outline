import { override } from "mobx";
import naturalSort from "@shared/utils/naturalSort";
import Group from "~/models/Group";
import type { PaginationParams } from "~/types";
import type RootStore from "./RootStore";
import Store, { type PaginatedResponse } from "./base/Store";

type FetchPageParams = PaginationParams & { query?: string };

export default class GroupsStore extends Store<Group> {
  constructor(rootStore: RootStore) {
    super(rootStore, Group);
  }

  @override
  get orderedData(): Group[] {
    return naturalSort(Array.from(this.data.values()), "name");
  }

  fetchPage = async (
    params: FetchPageParams | undefined
  ): Promise<PaginatedResponse<Group>> =>
    this.fetchPaginated("/groups.list", params, [this.rootStore.groupUsers]);

  /**
   * Returns groups that are in the given collection, optionally filtered by a query.
   *
   * @param collectionId
   * @param query
   * @returns A list of groups that are in the given collection.
   */
  inCollection = (collectionId: string, query?: string) => {
    const memberships = this.rootStore.groupMemberships.orderedData.filter(
      (member) => member.collectionId === collectionId
    );
    const groupIds = memberships.map((member) => member.groupId);
    const groups = this.orderedData.filter((group) =>
      groupIds.includes(group.id)
    );

    return query ? queriedGroups(groups, query) : groups;
  };

  /**
   * Returns groups that are not in the given document, optionally filtered by a query.
   *
   * @param documentId
   * @param query
   * @returns A list of groups that are not in the given document.
   */
  notInDocument = (documentId: string, query = "") => {
    const memberships = this.rootStore.groupMemberships.orderedData.filter(
      (member) => member.documentId === documentId
    );
    const groupIds = memberships.map((member) => member.groupId);
    const groups = this.orderedData.filter(
      (group) => !groupIds.includes(group.id)
    );

    return query ? queriedGroups(groups, query) : groups;
  };

  /**
   * Returns groups that are not in the given collection, optionally filtered by a query.
   *
   * @param collectionId
   * @param query
   * @returns A list of groups that are not in the given collection.
   */
  notInCollection = (collectionId: string, query = "") => {
    const memberships = this.rootStore.groupMemberships.orderedData.filter(
      (member) => member.collectionId === collectionId
    );
    const groupIds = memberships.map((member) => member.groupId);
    const groups = this.orderedData.filter(
      (group) => !groupIds.includes(group.id)
    );

    return query ? queriedGroups(groups, query) : groups;
  };
}

function queriedGroups(groups: Group[], query: string) {
  return groups.filter((group) =>
    group.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
}
