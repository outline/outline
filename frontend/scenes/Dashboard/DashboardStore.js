// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { Pagination } from 'types';
import Collection from 'models/Collection';

type Options = {
  team: Object,
  router: Object,
};

class DashboardStore {
  team: Object;
  router: Object;
  @observable collections: Array<Collection>;
  @observable pagination: Pagination;

  @observable isFetching: boolean = true;

  /* Actions */

  @action fetchCollections = async () => {
    this.isFetching = true;

    try {
      const res = await client.post('/collections.list', { id: this.team.id });
      invariant(
        res && res.data && res.pagination,
        'API response should be available'
      );
      const { data, pagination } = res;
      runInAction('fetchCollections', () => {
        this.collections = data.map(collection => new Collection(collection));
        this.pagination = pagination;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  constructor(options: Options) {
    this.team = options.team;
    this.router = options.router;
    this.fetchCollections();
  }
}

export default DashboardStore;
