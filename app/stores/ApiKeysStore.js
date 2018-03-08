// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { ApiKey, PaginationParams } from 'types';

class ApiKeysStore {
  @observable data: ApiKey[] = [];
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;

  @action
  fetchPage = async (options: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post('/apiKeys.list', options);
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('fetchApiKeys', () => {
        this.data = data;
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
        this.data.push(data);
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
        this.fetchPage();
      });
    } catch (e) {
      console.error('Something went wrong');
    }
  };
}

export default ApiKeysStore;
