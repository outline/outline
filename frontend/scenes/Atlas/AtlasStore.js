import { observable, action } from 'mobx';
import { client } from 'utils/ApiClient';

const store = new class AtlasStore {
  @observable collection;

  @observable isFetching = true;

  /* Actions */

  @action fetchCollection = async (id, successCallback) => {
    this.isFetching = true;
    this.collection = null;

    try {
      const res = await client.get('/collections.info', { id });
      const { data } = res;
      this.collection = data;
      successCallback(data);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };
}();

export default store;
