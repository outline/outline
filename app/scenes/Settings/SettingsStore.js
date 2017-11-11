// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { ApiKey } from 'types';

class SearchStore {
  @observable apiKeys: ApiKey[] = [];
  @observable keyName: ?string;

  @observable isFetching: boolean = false;

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
  createApiKey = async () => {
    this.isFetching = true;

    try {
      const res = await client.post('/apiKeys.create', {
        name: this.keyName ? this.keyName : 'Untitled key',
      });
      invariant(res && res.data, 'Data should be available');
      const { data } = res;
      runInAction('createApiKey', () => {
        this.apiKeys.push(data);
        this.keyName = '';
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action
  deleteApiKey = async (id: string) => {
    this.isFetching = true;

    try {
      await client.post('/apiKeys.delete', {
        id,
      });
      runInAction('deleteApiKey', () => {
        this.fetchApiKeys();
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action
  setKeyName = (value: SyntheticInputEvent) => {
    this.keyName = value.target.value;
  };

  constructor() {
    this.fetchApiKeys();
  }
}

export default SearchStore;
