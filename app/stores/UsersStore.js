// @flow
import { filter, orderBy } from 'lodash';
import { computed, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import User from 'models/User';

export default class UsersStore extends BaseStore<User> {
  constructor(rootStore: RootStore) {
    super(rootStore, User);
  }

  @computed
  get active(): User[] {
    return filter(this.orderedData, user => !user.isSuspended);
  }

  @computed
  get suspended(): User[] {
    return filter(this.orderedData, user => user.isSuspended);
  }

  @computed
  get admins(): User[] {
    return filter(this.orderedData, user => user.isAdmin);
  }

  @computed
  get orderedData(): User[] {
    return orderBy(Array.from(this.data.values()), 'name', 'asc');
  }

  @action
  promote = (user: User) => {
    return this.actionOnUser('promote', user);
  };

  @action
  demote = (user: User) => {
    return this.actionOnUser('demote', user);
  };

  @action
  suspend = (user: User) => {
    return this.actionOnUser('suspend', user);
  };

  @action
  activate = (user: User) => {
    return this.actionOnUser('activate', user);
  };

  @action
  invite = async (invites: { email: string, name: string }[]) => {
    const res = await client.post(`/users.invite`, { invites });
    invariant(res && res.data, 'Data should be available');
    return res.data;
  };

  actionOnUser = async (action: string, user: User) => {
    const res = await client.post(`/users.${action}`, {
      id: user.id,
    });
    invariant(res && res.data, 'Data should be available');
    const { data } = res;

    runInAction(`UsersStore#${action}`, () => {
      this.add(data);
    });
  };
}
