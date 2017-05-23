// @flow
import { observable, action, computed, runInAction } from 'mobx';
import invariant from 'invariant';
import _ from 'lodash';

import { client } from 'utils/ApiClient';
import Collection from 'models/Collection';
import type { Pagination, Team } from 'types';

type Options = {
  team: Team,
};

class CollectionsStore {
  team: Team;
  @observable data: Array<Collection> = observable.array([]);
  @observable pagination: Pagination;
  @observable activeCollectionId: string;

  @observable isFetching: boolean = false;
  @observable isLoaded: boolean = false;

  /* Computed */

  @computed get activeCollection(): ?Collection {
    return this.activeCollectionId
      ? _.find(this.data, { id: this.activeCollectionId })
      : null;
  }

  /* Actions */

  @action setActiveCollection = (id: string) => {
    this.activeCollectionId = id;
  };

  @action fetchCollections = async () => {
    this.isFetching = true;

    // try {
    const res = await client.post('/collections.list', { id: this.team.id });
    const { data, pagination } = res;
    runInAction('fetchCollections', () => {
      // $FlowIssue observable array
      this.data.replace(
        data.map(
          collection =>
            new Collection({
              collection,
              client,
            })
        )
      );
      this.pagination = pagination;
    });
    // } catch (e) {
    //   console.error('Something went wrong');
    // }

    this.isFetching = false;
    this.isLoaded = true;
  };

  constructor(options: Options) {
    this.team = options.team;
  }
}

export const loadCollections = (stores, user) => {
  if (
    !stores.collections ||
    !stores.collections.data ||
    stores.collections.data.length === 0
  ) {
    stores.collections = new CollectionsStore({
      team: user.team,
    });
    stores.collections.fetchCollections();
  }
  return stores.collections;
};
export default CollectionsStore;
