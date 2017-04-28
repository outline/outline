import { observable, action, runInAction } from 'mobx';
import { client, cacheResponse } from 'utils/ApiClient';

class DashboardStore {
  @observable collections;
  @observable pagination;

  @observable isFetching = true;

  /* Actions */

  @action fetchCollections = async () => {
    this.isFetching = true;

    try {
      const res = await client.post('/collections.list', { id: this.team.id });
      const { data, pagination } = res;
      runInAction('fetchCollections', () => {
        this.collections = data;
        this.pagination = pagination;
        data.forEach(collection => cacheResponse(collection.recentDocuments));
      });

      // If only one collection, visit it automatically
      if (this.collections.length === 1) {
        this.router.push(this.collections[0].url);
      }
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  constructor(options) {
    this.team = options.team;
    this.router = options.router;
    this.fetchCollections();
  }
}

export default DashboardStore;
