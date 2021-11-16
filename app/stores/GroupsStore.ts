import invariant from "invariant";
import { filter } from "lodash";
import { action, runInAction, computed } from "mobx";
import naturalSort from "shared/utils/naturalSort";
import Group from "models/Group";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { PaginationParams } from "types";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/ApiClient' or its corres... Remove this comment to see the full error message
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
  fetchPage = async (
    params: PaginationParams | null | undefined
  ): Promise<any> => {
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

  notInCollection = (collectionId: string, query = "") => {
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

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'groups' implicitly has an 'any' type.
function queriedGroups(groups, query) {
  return filter(groups, (group) =>
    group.name.toLowerCase().match(query.toLowerCase())
  );
}
