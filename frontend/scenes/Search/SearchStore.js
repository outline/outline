// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { Pagination, Document } from 'types';

class SearchStore {
  @observable documents: ?(Document[]);
  @observable pagination: Pagination;
  @observable searchTerm: ?string = null;

  @observable isFetching = false;

  /* Actions */

  @action search = async (query: string) => {
    this.searchTerm = query;
    this.isFetching = true;

    if (query) {
      try {
        const res = await client.get('/documents.search', { query });
        invariant(res && res.data && res.pagination, 'API response');
        const { data, pagination } = res;
        runInAction('search document', () => {
          this.documents = data;
          this.pagination = pagination;
        });
      } catch (e) {
        console.error('Something went wrong');
      }
    } else {
      this.documents = null;
    }

    this.isFetching = false;
  };
}

export default SearchStore;
