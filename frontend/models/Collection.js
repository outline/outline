// @flow
import { extendObservable, action, computed, runInAction } from 'mobx';
import invariant from 'invariant';
import _ from 'lodash';

import ApiClient, { client } from 'utils/ApiClient';
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

  /* computed */

  @computed get documentTree() {}

  /* Actions */

  @action update = async () => {
    try {
      const res = await client.post('/collections.info', { id: this.id });
      invariant(
        res && res.data && res.pagination,
        'API response should be available'
      );
      const { data } = res;
      runInAction('Collection#update', () => {
        this.updateData(data);
      });
    } catch (e) {
      console.error('Something went wrong');
    }
  };

  updateData(data: Collection) {
    extendObservable(this, data);
  }

  constructor(options: { collection: Collection, client: ApiClient }) {
    this.updateData(options.collection);
    this.client = options.client;
  }
}

export default Collection;
