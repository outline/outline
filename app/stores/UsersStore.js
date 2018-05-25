// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { User, PaginationParams } from 'types';

class UsersStore {
  @observable data: User[] = [];
  @observable isSaving: boolean = false;

  @action
  fetchPage = async (options: ?PaginationParams): Promise<*> => {
    try {
      const res = await client.post('/team.users', options);
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('fetchUsers', () => {
        this.data = data.reverse();
      });
    } catch (e) {
      console.error('Something went wrong');
    }
  };

  @action
  promote = async (user: User) => {
    return this.actionOnUser('promote', user);
  };

  @action
  demote = async (user: User) => {
    return this.actionOnUser('demote', user);
  };

  @action
  suspend = async (user: User) => {
    return this.actionOnUser('suspend', user);
  };

  @action
  activate = async (user: User) => {
    return this.actionOnUser('activate', user);
  };

  actionOnUser = async (action: string, user: User) => {
    try {
      const res = await client.post(`/user.${action}`, {
        id: user.id,
      });
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction(`UsersStore#${action}`, () => {
        this.data = this.data.map(user => (user.id === data.id ? data : user));
      });
    } catch (e) {
      console.error('Something went wrong');
    }
  };
}

export default UsersStore;
