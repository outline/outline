// @flow
import { extendObservable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import _ from 'lodash';

import ApiClient, { client } from 'utils/ApiClient';
import stores from 'stores';
import ErrorsStore from 'stores/ErrorsStore';
import type { NavigationNode } from 'types';

class Collection {
  createdAt: string;
  description: ?string;
  id: string;
  name: string;
  type: 'atlas' | 'journal';
  navigationTree: NavigationNode;
  updatedAt: string;
  url: string;

  client: ApiClient;
  errors: ErrorsStore;

  /* Actions */

  @action update = async () => {
    try {
      const res = await this.client.post('/collections.info', { id: this.id });
      invariant(res && res.data, 'API response should be available');
      const { data } = res;
      runInAction('Collection#update', () => {
        this.updateData(data);
      });
    } catch (e) {
      this.errors.add('Collection failed loading');
    }
  };

  updateData(data: Collection) {
    extendObservable(this, data);
  }

  constructor(collection: Collection) {
    this.updateData(collection);
    this.client = client;
    this.errors = stores.errors;
  }
}

export default Collection;
