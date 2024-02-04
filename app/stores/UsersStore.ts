import commandScore from "command-score";
import invariant from "invariant";
import deburr from "lodash/deburr";
import differenceWith from "lodash/differenceWith";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
import { observable, computed, action, runInAction } from "mobx";
import { type JSONObject, UserRole } from "@shared/types";
import User from "~/models/User";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

type UserCounts = {
  active: number;
  admins: number;
  all: number;
  invited: number;
  suspended: number;
  viewers: number;
};

export default class UsersStore extends Store<User> {
  actions = [
    RPCAction.Info,
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Update,
    RPCAction.Delete,
    RPCAction.Count,
  ];

  @observable
  counts: UserCounts = {
    active: 0,
    admins: 0,
    all: 0,
    invited: 0,
    suspended: 0,
    viewers: 0,
  };

  constructor(rootStore: RootStore) {
    super(rootStore, User);
  }

  @computed
  get active(): User[] {
    return this.orderedData.filter(
      (user) => !user.isSuspended && user.lastActiveAt
    );
  }

  @computed
  get suspended(): User[] {
    return this.orderedData.filter((user) => user.isSuspended);
  }

  @computed
  get activeOrInvited(): User[] {
    return this.orderedData.filter((user) => !user.isSuspended);
  }

  @computed
  get invited(): User[] {
    return this.orderedData.filter((user) => user.isInvited);
  }

  @computed
  get admins(): User[] {
    return this.orderedData.filter((user) => user.isAdmin);
  }

  @computed
  get members(): User[] {
    return this.orderedData.filter(
      (user) => !user.isViewer && !user.isAdmin && !user.isInvited
    );
  }

  @computed
  get viewers(): User[] {
    return this.orderedData.filter((user) => user.isViewer);
  }

  @computed
  get all(): User[] {
    return this.orderedData.filter((user) => user.lastActiveAt);
  }

  @computed
  get orderedData(): User[] {
    return orderBy(
      Array.from(this.data.values()),
      (user) => user.name.toLocaleLowerCase(),
      "asc"
    );
  }

  @action
  promote = async (user: User) => {
    try {
      this.updateCounts(UserRole.Admin, user.role);
      await this.actionOnUser("promote", user);
    } catch (_e) {
      this.updateCounts(user.role, UserRole.Admin);
    }
  };

  @action
  demote = async (user: User, to: UserRole) => {
    try {
      this.updateCounts(to, user.role);
      await this.actionOnUser("demote", user, to);
    } catch (_e) {
      this.updateCounts(user.role, to);
    }
  };

  @action
  suspend = async (user: User) => {
    try {
      this.counts.suspended += 1;
      this.counts.active -= 1;
      await this.actionOnUser("suspend", user);
    } catch (_e) {
      this.counts.suspended -= 1;
      this.counts.active += 1;
    }
  };

  @action
  activate = async (user: User) => {
    try {
      this.counts.suspended -= 1;
      this.counts.active += 1;
      await this.actionOnUser("activate", user);
    } catch (_e) {
      this.counts.suspended += 1;
      this.counts.active -= 1;
    }
  };

  @action
  invite = async (
    invites: {
      email: string;
      name: string;
      role: UserRole;
    }[]
  ) => {
    const res = await client.post(`/users.invite`, {
      invites,
    });
    invariant(res?.data, "Data should be available");
    runInAction(`invite`, () => {
      res.data.users.forEach(this.add);
      this.counts.invited += res.data.sent.length;
      this.counts.all += res.data.sent.length;
    });
    return res.data;
  };

  @action
  resendInvite = async (user: User) =>
    client.post(`/users.resendInvite`, {
      id: user.id,
    });

  @action
  fetchCounts = async (
    teamId: string
  ): Promise<{
    counts: UserCounts;
  }> => {
    const res = await client.post(`/≈`, {
      teamId,
    });
    invariant(res?.data, "Data should be available");
    this.counts = res.data.counts;
    return res.data;
  };

  @action
  fetchDocumentUsers = async (params: {
    id: string;
    query?: string;
  }): Promise<User[]> => {
    try {
      const res = await client.post("/documents.users", params);
      invariant(res?.data, "User list not available");
      let response: User[] = [];
      runInAction("DocumentsStore#fetchUsers", () => {
        response = res.data.map(this.add);
        this.addPolicies(res.policies);
      });
      return response;
    } catch (err) {
      return Promise.resolve([]);
    }
  };

  @action
  async delete(user: User, options: JSONObject = {}) {
    await super.delete(user, options);

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

    if (user.isViewer) {
      this.counts.viewers -= 1;
    }

    this.counts.all -= 1;
  }

  @action
  updateCounts = (to: UserRole, from: UserRole) => {
    if (to === UserRole.Admin) {
      this.counts.admins += 1;

      if (from === UserRole.Viewer) {
        this.counts.viewers -= 1;
      }
    }

    if (to === UserRole.Viewer) {
      this.counts.viewers += 1;

      if (from === UserRole.Admin) {
        this.counts.admins -= 1;
      }
    }

    if (to === UserRole.Member) {
      if (from === UserRole.Viewer) {
        this.counts.viewers -= 1;
      }

      if (from === UserRole.Admin) {
        this.counts.admins -= 1;
      }
    }
  };

  notInDocument = (documentId: string, query = "") => {
    const document = this.rootStore.documents.get(documentId);
    const teamMembers = this.activeOrInvited;
    const documentMembers = document?.members ?? [];
    const users = differenceWith(
      teamMembers,
      documentMembers,
      (teamMember, documentMember) => teamMember.id === documentMember.id
    );
    return queriedUsers(users, query);
  };

  notInCollection = (collectionId: string, query = "") => {
    const memberships = filter(
      this.rootStore.memberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const userIds = memberships.map((member) => member.userId);
    const users = filter(
      this.activeOrInvited,
      (user) => !userIds.includes(user.id)
    );
    return queriedUsers(users, query);
  };

  inCollection = (collectionId: string, query?: string) => {
    const memberships = filter(
      this.rootStore.memberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const userIds = memberships.map((member) => member.userId);
    const users = filter(this.activeOrInvited, (user) =>
      userIds.includes(user.id)
    );
    return queriedUsers(users, query);
  };

  notInGroup = (groupId: string, query = "") => {
    const memberships = filter(
      this.rootStore.groupMemberships.orderedData,
      (member) => member.groupId === groupId
    );
    const userIds = memberships.map((member) => member.userId);
    const users = filter(
      this.activeOrInvited,
      (user) => !userIds.includes(user.id)
    );
    return queriedUsers(users, query);
  };

  inGroup = (groupId: string, query?: string) => {
    const groupMemberships = filter(
      this.rootStore.groupMemberships.orderedData,
      (member) => member.groupId === groupId
    );
    const userIds = groupMemberships.map((member) => member.userId);
    const users = filter(this.activeOrInvited, (user) =>
      userIds.includes(user.id)
    );
    return queriedUsers(users, query);
  };

  actionOnUser = async (action: string, user: User, to?: UserRole) => {
    const res = await client.post(`/users.${action}`, {
      id: user.id,
      to,
    });
    invariant(res?.data, "Data should be available");
    runInAction(`UsersStore#${action}`, () => {
      this.addPolicies(res.policies);
      this.add(res.data);
    });
  };
}

function queriedUsers(users: User[], query?: string) {
  const normalizedQuery = deburr((query || "").toLocaleLowerCase());

  return normalizedQuery
    ? filter(
        users,
        (user) =>
          deburr(user.name.toLocaleLowerCase()).includes(normalizedQuery) ||
          user.email?.includes(normalizedQuery)
      )
        .map((user) => ({
          user,
          score: commandScore(user.name, normalizedQuery),
        }))
        .sort((a, b) => b.score - a.score)
        .map(({ user }) => user)
    : users;
}
