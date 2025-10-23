import invariant from "invariant";
import filter from "lodash/filter";
import { action, runInAction, computed } from "mobx";
import naturalSort from "@shared/utils/naturalSort";
import Group from "~/models/Group";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store from "./base/Store";

type FetchPageParams = PaginationParams & { query?: string };

export default class GroupsStore extends Store<Group> {
  constructor(rootStore: RootStore) {
    super(rootStore, Group);
  }

  @computed
  get orderedData(): Group[] {
    return naturalSort(Array.from(this.data.values()), "name");
  }

  @computed
  get mentionableData(): Group[] {
    return this.orderedData.filter((group) => !group.disableMentions);
  }

  @action
  fetchPage = async (params: FetchPageParams | undefined): Promise<Group[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/groups.list`, params);
      invariant(res?.data, "Data not available");

      let models: Group[] = [];
      runInAction(`GroupsStore#fetchPage`, () => {
        this.addPolicies(res.policies);
        models = res.data.groups.map(this.add);
        res.data.groupMemberships.forEach(this.rootStore.groupUsers.add);
        this.isLoaded = true;
      });
      return models;
    } finally {
      this.isFetching = false;
    }
  };

  /**
   * Returns groups that are in the given collection, optionally filtered by a query.
   *
   * @param collectionId
   * @param query
   * @returns A list of groups that are in the given collection.
   */
  inCollection = (collectionId: string, query?: string) => {
    const memberships = filter(
      this.rootStore.groupMemberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const groupIds = memberships.map((member) => member.groupId);
    const groups = filter(this.orderedData, (group) =>
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
    const memberships = filter(
      this.rootStore.groupMemberships.orderedData,
      (member) => member.documentId === documentId
    );
    const groupIds = memberships.map((member) => member.groupId);
    const groups = filter(
      this.orderedData,
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
    const memberships = filter(
      this.rootStore.groupMemberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const groupIds = memberships.map((member) => member.groupId);
    const groups = filter(
      this.orderedData,
      (group) => !groupIds.includes(group.id)
    );

    return query ? queriedGroups(groups, query) : groups;
  };

  /**
   * Override the base findByQuery to filter out groups with disableMentions: true
   */
  findByQuery = (query: string, options?: { maxResults: number }): Group[] => {
    const normalized = query?.trim().toLocaleLowerCase() || "";

    if (!normalized) {
      return this.mentionableData
        .filter((item) => {
          if ("deletedAt" in item && item.deletedAt) {
            return false;
          }
          if ("archivedAt" in item && item.archivedAt) {
            return false;
          }
          return true;
        })
        .slice(0, options?.maxResults);
    }

    return this.mentionableData
      .filter((item) => {
        if ("deletedAt" in item && item.deletedAt) {
          return false;
        }
        if ("archivedAt" in item && item.archivedAt) {
          return false;
        }
        if ("searchContent" in item) {
          const searchables =
            typeof item.searchContent === "string"
              ? [item.searchContent]
              : item.searchContent;
          return searchables.some((searchable) =>
            searchable.toLocaleLowerCase().includes(normalized)
          );
        }
        return false;
      })
      .map((item) => {
        const searchables =
          typeof item.searchContent === "string"
            ? [item.searchContent]
            : item.searchContent;

        return {
          score:
            searchables
              .map((searchable) => {
                let score = 0;
                if (searchable.toLocaleLowerCase().includes(normalized)) {
                  score = 1;
                }
                return score;
              })
              .reduce((a, b) => a + b, 0) / searchables.length,
          item,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((result) => result.item)
      .slice(0, options?.maxResults);
  };
}

function queriedGroups(groups: Group[], query: string) {
  return groups.filter((group) =>
    group.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
}
