// @flow
import { observable, action } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import { notFoundUrl } from 'utils/routeHelpers';

class CollectionStore {
  @observable redirectUrl: ?string;
  @observable isFetching = true;

  /* Actions */

  @action fetchCollection = async (id: string) => {
    this.isFetching = true;

    try {
      const res = await client.get('/collections.info', { id });
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      if (data.type === 'atlas') this.redirectUrl = data.documents[0].url;
      else throw new Error('TODO code up non-atlas collections');
    } catch (e) {
      this.redirectUrl = notFoundUrl();
    }
    this.isFetching = false;
  };
}

export default CollectionStore;
