// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { Share, PaginationParams } from 'types';

class SharesStore {
  @observable data: Share[] = [];
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;

  @action
  fetchPage = async (options: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post('/shares.list', options);
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('fetchShares', () => {
        this.data = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action
  deleteShare = async (id: string) => {
    try {
      await client.post('/shares.delete', { id });
      runInAction('deleteShare', () => {
        this.fetchPage();
      });
    } catch (e) {
      console.error('Something went wrong');
    }
  };
}

export default SharesStore;
