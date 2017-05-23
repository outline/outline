// @flow
import { observable, action, computed } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import Collection from 'models/Collection';

const store = new class AtlasStore {
  @observable collection: ?(Collection & { recentDocuments?: Object[] });

  @observable isFetching = true;

  /* Computed */

  @computed get isLoaded(): boolean {
    return !this.isFetching && !!this.collection;
  }

  /* Actions */

  @action fetchCollection = async (id: string, successCallback: Function) => {
    this.isFetching = true;
    this.collection = null;

    try {
      const res = await client.get('/collections.info', { id });
      invariant(res && res.data, 'Data should be available');
      const { data } = res;
      this.collection = new Collection(data);
      successCallback(data);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };
}();

export default store;
