// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { Pagination, Collection, Team } from 'types';

type Options = {
  team: Team,
};

class DashboardStore {
  team: Object;
  router: Object;
  @observable collections: Array<Collection> = observable.array([]);
  @observable pagination: Pagination;

  @observable isFetching: boolean = false;
  @observable isLoaded: boolean = false;

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
        this.collections = data;
        this.pagination = pagination;
      });
    } catch (e) {
      console.error('Something went wrong');
    }

    this.isFetching = false;
    this.isLoaded = true;
  };

  constructor(options: Options) {
    this.team = options.team;
  }
}

export default DashboardStore;
