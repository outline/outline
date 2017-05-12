// @flow
import { observable, action, computed, runInAction } from 'mobx';
import invariant from 'invariant';
import _ from 'lodash';

import { client } from 'utils/ApiClient';
import type { Pagination, Collection, Team } from 'types';

type Options = {
  team: Team,
};

const filterOptions = ['viewed', 'updated', 'created'];

class DashboardStore {
  team: Team;
  router: Object;
  @observable collections: Array<Collection> = observable.array([]);
  @observable pagination: Pagination;
  @observable selectedFilter: string = 'viewed';

  @observable isFetching: boolean = false;
  @observable isLoaded: boolean = false;

  /* Computed */

  @computed get filterOptions(): { name: string, selected: boolean }[] {
    return _.map(filterOptions, option => ({
      name: option,
      selected: option === this.selectedFilter,
    }));
  }

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
        // $FlowIssue observable array
        this.collections.replace(data);
        this.pagination = pagination;
      });
    } catch (e) {
      console.error('Something went wrong');
    }

    this.isFetching = false;
    this.isLoaded = true;
  };

  @action filter = (option: string) => {
    this.selectedFilter = option;
  };

  constructor(options: Options) {
    this.team = options.team;
  }
}

export default DashboardStore;
