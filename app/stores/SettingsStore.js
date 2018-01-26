// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { ApiKey, User } from 'types';

class SettingsStore {
  @observable apiKeys: ApiKey[] = [];
  @observable members: User[] = [];
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;

  @action
  fetchApiKeys = async () => {
    this.isFetching = true;

    try {
      const res = await client.post('/apiKeys.list');
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('fetchApiKeys', () => {
        this.apiKeys = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action
  createApiKey = async (name: string) => {
    this.isSaving = true;

    try {
      const res = await client.post('/apiKeys.create', { name });
      invariant(res && res.data, 'Data should be available');
      const { data } = res;
      runInAction('createApiKey', () => {
        this.apiKeys.push(data);
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isSaving = false;
  };

  @action
  deleteApiKey = async (id: string) => {
    try {
      await client.post('/apiKeys.delete', { id });
      runInAction('deleteApiKey', () => {
        this.fetchApiKeys();
      });
    } catch (e) {
      console.error('Something went wrong');
    }
  };

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

export default SettingsStore;
