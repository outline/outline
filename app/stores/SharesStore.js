// @flow
import { sortBy } from 'lodash';
import { action, runInAction, computed } from 'mobx';
import { client } from 'utils/ApiClient';
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import Share from 'models/Share';

class SharesStore extends BaseStore<Share> {
  constructor(rootStore: RootStore) {
    super({
      model: Share,
      actions: ['list', 'create'],
      rootStore,
    });
  }

  @computed
  get orderedData(): Share[] {
    return sortBy(this.data.values(), 'createdAt').reverse();
  }

  @action
  revoke = async (share: Share) => {
    await client.post('/shares.revoke', { id: share.id });
    runInAction('revoke', () => {
      this.remove(share.id);
    });
  };
}

export default SharesStore;
