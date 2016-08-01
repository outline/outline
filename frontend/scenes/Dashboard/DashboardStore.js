import { observable, action, runInAction } from 'mobx';
import { client, cacheResponse } from 'utils/ApiClient';

const store = new class DashboardStore {
  @observable atlases;
  @observable pagination;

  @observable isFetching = true;

  /* Actions */

  @action fetchAtlases = async (teamId) => {
    this.isFetching = true;

    try {
      const res = await client.post('/atlases.list', { id: teamId });
      const { data, pagination } = res;
      runInAction('fetchAtlases', () => {
        this.atlases = data;
        this.pagination = pagination;
        data.forEach((collection) => cacheResponse(collection.recentDocuments));
      });
    } catch (e) {
      console.error("Something went wrong");
    }
    this.isFetching = false;
  }
}();

export default store;
