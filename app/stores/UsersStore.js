// @flow
import { filter } from 'lodash';
import { computed, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import User from 'models/User';

class UsersStore extends BaseStore<User> {
  constructor(rootStore: RootStore) {
    super({
      model: User,
      rootStore,
    });
  }

  @computed
  get active(): User[] {
    return filter(this.data.values(), user => !user.isSuspended);
  }

  @computed
  get admins(): User[] {
    return filter(this.data.values(), user => user.isAdmin);
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

  actionOnUser = async (action: string, user: User) => {
    const res = await client.post(`/user.${action}`, {
      id: user.id,
    });
    invariant(res && res.data, 'Data should be available');
    const { data } = res;

    runInAction(`UsersStore#${action}`, () => {
      this.add(data);
    });
  };
}

export default UsersStore;
