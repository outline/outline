// @flow
import invariant from "invariant";
import { filter } from "lodash";
import { action, runInAction, computed } from "mobx";
import naturalSort from "shared/utils/naturalSort";
import Group from "models/Group";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import type { PaginationParams } from "types";
import { client } from "utils/ApiClient";

export default class GroupsStore extends BaseStore<Group> {
  constructor(rootStore: RootStore) {
    super(rootStore, Group);
  }

  @computed
  get orderedData(): Group[] {
    return naturalSort(Array.from(this.data.values()), "name");
  }

  @action
  fetchPage = async (params: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/groups.list`, params);

      invariant(res && res.data, "Data not available");

      runInAction(`GroupsStore#fetchPage`, () => {
        this.addPolicies(res.policies);
        res.data.groups.forEach(this.add);
        res.data.groupMemberships.forEach(this.rootStore.groupMemberships.add);
        this.isLoaded = true;
      });
      return res.data.groups;
    } finally {
      this.isFetching = false;
    }
  };

  inCollection = (collectionId: string, query: string) => {
    const memberships = filter(
      this.rootStore.collectionGroupMemberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const groupIds = memberships.map((member) => member.groupId);
    const groups = filter(this.orderedData, (group) =>
      groupIds.includes(group.id)
    );

    if (!query) return groups;
    return queriedGroups(groups, query);
  };

  notInCollection = (collectionId: string, query: string = "") => {
    const memberships = filter(
      this.rootStore.collectionGroupMemberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const groupIds = memberships.map((member) => member.groupId);
    const groups = filter(
      this.orderedData,
      (group) => !groupIds.includes(group.id)
    );

    if (!query) return groups;
    return queriedGroups(groups, query);
  };
}

function queriedGroups(groups, query) {
  return filter(groups, (group) =>
    group.name.toLowerCase().match(query.toLowerCase())
  );
}
