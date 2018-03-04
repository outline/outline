// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { User } from 'types';

class SettingsUsersStore {
  @observable members: User[] = [];
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;

  @action
  fetchMembers = async () => {
    this.isFetching = true;

    try {
      const res = await client.post('/team.users');
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('fetchMembers', () => {
        this.members = data.reverse();
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };
}

export default SettingsUsersStore;
