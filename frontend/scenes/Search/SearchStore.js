// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { Document } from 'types';

class SearchStore {
  @observable documents: Array<Document> = [];
  @observable searchTerm: ?string = null;

  @observable isFetching = false;

  /* Actions */

  @action search = async (query: string) => {
    this.searchTerm = query;
    this.isFetching = true;

    if (query) {
      try {
        const res = await client.get('/documents.search', { query });
        invariant(res && res.data, 'res or res.data missing');
        const { data } = res;
        runInAction('search document', () => {
          this.documents = data;
        });
      } catch (e) {
        console.error('Something went wrong');
      }
    } else {
      this.documents = [];
    }

    this.isFetching = false;
  };
}

export default SearchStore;
