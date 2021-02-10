// @flow
import invariant from "invariant";
import { filter, orderBy } from "lodash";
import { observable, computed, action, runInAction } from "mobx";
import User from "models/User";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import { client } from "utils/ApiClient";

export default class UsersStore extends BaseStore<User> {
  @observable counts: {
    active: number,
    admins: number,
    all: number,
    invited: number,
    suspended: number,
  } = {};

  constructor(rootStore: RootStore) {
    super(rootStore, User);
  }

  @computed
  get active(): User[] {
    return filter(
      this.orderedData,
      (user) => !user.isSuspended && user.lastActiveAt
    );
  }

  @computed
  get suspended(): User[] {
    return filter(this.orderedData, (user) => user.isSuspended);
  }

  @computed
  get activeOrInvited(): User[] {
    return filter(this.orderedData, (user) => !user.isSuspended);
  }

  @computed
  get invited(): User[] {
    return filter(this.orderedData, (user) => user.isInvited);
  }

  @computed
  get admins(): User[] {
    return filter(this.orderedData, (user) => user.isAdmin);
  }

  @computed
  get all(): User[] {
    return filter(this.orderedData, (user) => user.lastActiveAt);
  }

  @computed
  get orderedData(): User[] {
    return orderBy(Array.from(this.data.values()), "name", "asc");
  }

  @action
  promote = (user: User) => {
    this.counts.admins += 1;
    return this.actionOnUser("promote", user);
  };

  @action
  demote = (user: User) => {
    this.counts.admins -= 1;
    return this.actionOnUser("demote", user);
  };

  @action
  suspend = (user: User) => {
    this.counts.suspended += 1;
    return this.actionOnUser("suspend", user);
  };

  @action
  activate = (user: User) => {
    this.counts.suspended -= 1;
    return this.actionOnUser("activate", user);
  };

  @action
  invite = async (invites: { email: string, name: string }[]) => {
    const res = await client.post(`/users.invite`, { invites });
    invariant(res && res.data, "Data should be available");
    runInAction(`invite`, () => {
      res.data.users.forEach(this.add);
      this.counts.invited += res.data.sent.length;
      this.counts.all += res.data.sent.length;
    });
    return res.data;
  };

  @action
  fetchCounts = async (teamId: string): Promise<*> => {
    const res = await client.post(`/users.count`, { teamId });
    invariant(res && res.data, "Data should be available");

    this.counts = res.data.counts;
    return res.data;
  };

  @action
  async delete(user: User, options: Object = {}) {
    super.delete(user, options);
    if (!user.isSuspended && user.lastActiveAt) {
      this.counts.active -= 1;
    }
    if (user.isInvited) {
      this.counts.invited -= 1;
    }
    if (user.isAdmin) {
      this.counts.admins -= 1;
    }
    if (user.isSuspended) {
      this.counts.suspended -= 1;
    }
    this.counts.all -= 1;
  }

  notInCollection = (collectionId: string, query: string = "") => {
    const memberships = filter(
      this.rootStore.memberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const userIds = memberships.map((member) => member.userId);
    const users = filter(
      this.activeOrInvited,
      (user) => !userIds.includes(user.id)
    );

    if (!query) return users;
    return queriedUsers(users, query);
  };

  inCollection = (collectionId: string, query: string) => {
    const memberships = filter(
      this.rootStore.memberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const userIds = memberships.map((member) => member.userId);
    const users = filter(this.activeOrInvited, (user) =>
      userIds.includes(user.id)
    );

    if (!query) return users;
    return queriedUsers(users, query);
  };

  notInGroup = (groupId: string, query: string = "") => {
    const memberships = filter(
      this.rootStore.groupMemberships.orderedData,
      (member) => member.groupId === groupId
    );
    const userIds = memberships.map((member) => member.userId);
    const users = filter(
      this.activeOrInvited,
      (user) => !userIds.includes(user.id)
    );

    if (!query) return users;
    return queriedUsers(users, query);
  };

  inGroup = (groupId: string, query: string) => {
    const groupMemberships = filter(
      this.rootStore.groupMemberships.orderedData,
      (member) => member.groupId === groupId
    );
    const userIds = groupMemberships.map((member) => member.userId);
    const users = filter(this.activeOrInvited, (user) =>
      userIds.includes(user.id)
    );

    if (!query) return users;
    return queriedUsers(users, query);
  };

  actionOnUser = async (action: string, user: User) => {
    const res = await client.post(`/users.${action}`, {
      id: user.id,
    });
    invariant(res && res.data, "Data should be available");

    runInAction(`UsersStore#${action}`, () => {
      this.addPolicies(res.policies);
      this.add(res.data);
    });
  };
}

function queriedUsers(users, query) {
  return filter(users, (user) =>
    user.name.toLowerCase().includes(query.toLowerCase())
  );
}
