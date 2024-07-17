import invariant from "invariant";
import filter from "lodash/filter";
import { action, runInAction } from "mobx";
import GroupUserMembership from "~/models/GroupUserMembership";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class GroupUserMembershipsStore extends Store<GroupUserMembership> {
  actions = [RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, GroupUserMembership);
  }

  @action
  fetchPage = async (
    params: PaginationParams | undefined
  ): Promise<GroupUserMembership[]> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/groups.memberships`, params);
      invariant(res?.data, "Data not available");

      let models: GroupUserMembership[] = [];
      runInAction(`GroupUserMembershipsStore#fetchPage`, () => {
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
    runInAction(`GroupUserMembershipsStore#delete`, () => {
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
