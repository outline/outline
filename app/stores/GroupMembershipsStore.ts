import invariant from "invariant";
import filter from "lodash/filter";
import { action, runInAction } from "mobx";
import GroupMembership from "~/models/GroupMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class GroupMembershipsStore extends BaseStore<GroupMembership> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, GroupMembership);
  }

  @action
  fetchPage = async (
    params: PaginationParams | undefined
  ): Promise<GroupMembership[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/groups.memberships`, params);
      invariant(res?.data, "Data not available");

      let models: GroupMembership[] = [];
      runInAction(`GroupMembershipsStore#fetchPage`, () => {
        res.data.users.forEach(this.rootStore.users.add);
        models = res.data.groupMemberships.map(this.add);
        this.isLoaded = true;
      });
      return models;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  async create({ groupId, userId }: { groupId: string; userId: string }) {
    const res = await client.post("/groups.add_user", {
      id: groupId,
      userId,
    });
    invariant(res?.data, "Group Membership data should be available");
    res.data.users.forEach(this.rootStore.users.add);
    res.data.groups.forEach(this.rootStore.groups.add);

    const groupMemberships = res.data.groupMemberships.map(this.add);
    return groupMemberships[0];
  }

  @action
  async delete({ groupId, userId }: { groupId: string; userId: string }) {
    const res = await client.post("/groups.remove_user", {
      id: groupId,
      userId,
    });
    invariant(res?.data, "Group Membership data should be available");
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

  inGroup = (groupId: string) =>
    filter(this.orderedData, (member) => member.groupId === groupId);
}
