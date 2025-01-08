import commandScore from "command-score";
import invariant from "invariant";
import deburr from "lodash/deburr";
import differenceWith from "lodash/differenceWith";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
import { computed, action, runInAction } from "mobx";
import { UserRole } from "@shared/types";
import User from "~/models/User";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class UsersStore extends Store<User> {
  actions = [
    RPCAction.Info,
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Update,
    RPCAction.Delete,
    RPCAction.Count,
  ];

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
  updateRole = async (user: User, role: UserRole) => {
    await this.actionOnUser("update_role", user, role);
  };

  @action
  suspend = async (user: User) => {
    await this.actionOnUser("suspend", user);
  };

  @action
  activate = async (user: User) => {
    await this.actionOnUser("activate", user);
  };

  @action
  invite = async (
    invites: {
      email: string;
      name: string;
      role: UserRole;
    }[]
  ): Promise<User[]> => {
    const res = await client.post(`/users.invite`, {
      invites,
    });
    invariant(res?.data, "Data should be available");

    let response: User[] = [];
    runInAction(`invite`, () => {
      response = res.data.users.map(this.add);
    });
    return response;
  };

  @action
  resendInvite = async (user: User) =>
    client.post(`/users.resendInvite`, {
      id: user.id,
    });

  /**
   * Returns users that are not in the given document, optionally filtered by a query.
   *
   * @param documentId
   * @param query
   * @returns A list of users that are not in the given document.
   */
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

  /**
   * Returns users that are not in the given collection, optionally filtered by a query.
   *
   * @param collectionId
   * @param query
   * @returns A list of users that are not in the given collection.
   */
  notInCollection = (collectionId: string, query = "") => {
    const groupUsers = filter(
      this.rootStore.memberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const userIds = groupUsers.map((groupUser) => groupUser.userId);
    const users = filter(
      this.activeOrInvited,
      (user) => !userIds.includes(user.id)
    );
    return queriedUsers(users, query);
  };

  inCollection = (collectionId: string, query?: string) => {
    const groupUsers = filter(
      this.rootStore.memberships.orderedData,
      (member) => member.collectionId === collectionId
    );
    const userIds = groupUsers.map((groupUser) => groupUser.userId);
    const users = filter(this.activeOrInvited, (user) =>
      userIds.includes(user.id)
    );
    return queriedUsers(users, query);
  };

  notInGroup = (groupId: string, query = "") => {
    const groupUsers = filter(
      this.rootStore.groupUsers.orderedData,
      (member) => member.groupId === groupId
    );
    const userIds = groupUsers.map((groupUser) => groupUser.userId);
    const users = filter(
      this.activeOrInvited,
      (user) => !userIds.includes(user.id)
    );
    return queriedUsers(users, query);
  };

  inGroup = (groupId: string, query?: string) => {
    const groupUsers = filter(
      this.rootStore.groupUsers.orderedData,
      (member) => member.groupId === groupId
    );
    const userIds = groupUsers.map((groupUser) => groupUser.userId);
    const users = filter(this.activeOrInvited, (user) =>
      userIds.includes(user.id)
    );
    return queriedUsers(users, query);
  };

  actionOnUser = async (action: string, user: User, role?: UserRole) => {
    const res = await client.post(`/users.${action}`, {
      id: user.id,
      role,
    });
    invariant(res?.data, "Data should be available");
    runInAction(`UsersStore#${action}`, () => {
      this.addPolicies(res.policies);
      this.add(res.data);
    });
  };
}

export function queriedUsers(users: User[], query?: string) {
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
