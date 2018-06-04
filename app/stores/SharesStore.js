// @flow
import _ from 'lodash';
import { observable, action, runInAction, ObservableMap, computed } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { Share, PaginationParams } from 'types';

class SharesStore {
  @observable data: Map<string, Share> = new ObservableMap([]);
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;

  @computed
  get orderedData(): Share[] {
    return _.sortBy(this.data.values(), 'createdAt').reverse();
  }

  @action
  fetchPage = async (options: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post('/shares.list', options);
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('fetchShares', () => {
        data.forEach(share => {
          this.data.set(share.id, share);
        });
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action
  revoke = async (share: Share) => {
    try {
      await client.post('/shares.revoke', { id: share.id });
      runInAction('revoke', () => {
        this.data.delete(share.id);
      });
    } catch (e) {
      console.error('Something went wrong');
    }
  };
}

export default SharesStore;
