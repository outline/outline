import { observable, action, runInAction } from 'mobx';
import { client } from 'utils/ApiClient';

class SearchStore {
  @observable documents;
  @observable pagination;
  @observable selectedDocument;
  @observable searchTerm;

  @observable isFetching = false;

  /* Actions */

  @action search = async query => {
    this.searchTerm = query;
    this.isFetching = true;

    if (query) {
      try {
        const res = await client.get('/documents.search', { query });
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
