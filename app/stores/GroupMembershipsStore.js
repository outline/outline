// @flow
import invariant from "invariant";
import { action, runInAction } from "mobx";
import { filter } from "lodash";
import { client } from "utils/ApiClient";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import GroupMembership from "models/GroupMembership";
import type { PaginationParams } from "types";

export default class GroupMembershipsStore extends BaseStore<GroupMembership> {
  actions = ["create", "delete"];

  constructor(rootStore: RootStore) {
    super(rootStore, GroupMembership);
  }

  @action
  fetchPage = async (params: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/groups.memberships`, params);

      invariant(res && res.data, "Data not available");

      runInAction(`GroupMembershipsStore#fetchPage`, () => {
        res.data.users.forEach(this.rootStore.users.add);
        res.data.groupMemberships.forEach(this.add);
        this.isLoaded = true;
      });
      return res.data.users;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  async create({ groupId, userId }: { groupId: string, userId: string }) {
    const res = await client.post("/groups.add_user", {
      id: groupId,
      userId,
    });
    invariant(res && res.data, "Group Membership data should be available");

    res.data.users.forEach(this.rootStore.users.add);
    res.data.groups.forEach(this.rootStore.groups.add);
    res.data.groupMemberships.forEach(this.add);
  }

  @action
  async delete({ groupId, userId }: { groupId: string, userId: string }) {
    const res = await client.post("/groups.remove_user", {
      id: groupId,
      userId,
    });
    invariant(res && res.data, "Group Membership data should be available");

    this.remove(`${userId}-${groupId}`);

    runInAction(`GroupMembershipsStore#delete`, () => {
      res.data.groups.forEach(this.rootStore.groups.add);
      this.isLoaded = true;
    });
  }

  @action
  removeGroupMemberships = (groupId: string) => {
    this.data.forEach((_, key) => {
      if (key.includes(groupId)) {
        this.remove(key);
      }
    });
  };

  inGroup = (groupId: string) => {
    return filter(this.orderedData, member => member.groupId === groupId);
  };
}
