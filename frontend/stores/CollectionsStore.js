// @flow
import { observable, action, runInAction, ObservableArray } from 'mobx';
import ApiClient, { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import stores from 'stores';
import Collection from 'models/Collection';
import ErrorsStore from 'stores/ErrorsStore';

type Options = {
  teamId: string,
};

class CollectionsStore {
  @observable data: ObservableArray<Collection> = observable.array([]);
  @observable isLoaded: boolean = false;

  client: ApiClient;
  teamId: string;
  errors: ErrorsStore;

  /* Actions */

  @action fetchAll = async (): Promise<*> => {
    try {
      const res = await this.client.post('/collections.list', {
        id: this.teamId,
      });
      invariant(res && res.data, 'Collection list not available');
      const { data } = res;
      runInAction('CollectionsStore#fetch', () => {
        this.data.replace(data.map(collection => new Collection(collection)));
        this.isLoaded = true;
      });
    } catch (e) {
      this.errors.add('Failed to load collections');
    }
  };

  getById = (id: string): Collection => {
    return _.find(this.data, { id });
  };

  @action add = (collection: Collection): void => {
    this.data.push(collection);
  };

  @action remove = (id: string): void => {
    this.data.splice(this.data.indexOf(id), 1);
  };

  constructor(options: Options) {
    this.client = client;
    this.errors = stores.errors;
    this.teamId = options.teamId;
  }
}

export default CollectionsStore;
