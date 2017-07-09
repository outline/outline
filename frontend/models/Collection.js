// @flow
import { extendObservable, action, computed, runInAction } from 'mobx';
import invariant from 'invariant';
import _ from 'lodash';

import { client } from 'utils/ApiClient';
import stores from 'stores';
import ErrorsStore from 'stores/ErrorsStore';
import type { NavigationNode } from 'types';

class Collection {
  isSaving: boolean = false;
  hasPendingChanges: boolean = false;
  errors: ErrorsStore;

  createdAt: string;
  description: ?string;
  id: string;
  name: string;
  type: 'atlas' | 'journal';
  documents: Array<NavigationNode>;
  updatedAt: string;
  url: string;

  /* Computed */

  @computed get entryUrl(): string {
    return this.type === 'atlas' ? this.documents[0].url : this.url;
  }

  /* Actions */

  @action fetch = async () => {
    try {
      const res = await client.post('/collections.info', { id: this.id });
      invariant(res && res.data, 'API response should be available');
      const { data } = res;
      runInAction('Collection#fetch', () => {
        this.updateData(data);
      });
    } catch (e) {
      this.errors.add('Collection failed loading');
    }

    return this;
  };

  @action save = async () => {
    if (this.isSaving) return this;
    this.isSaving = true;

    try {
      let res;
      if (this.id) {
        res = await client.post('/collections.update', {
          id: this.id,
          name: this.name,
          description: this.description,
        });
      } else {
        res = await client.post('/collections.create', {
          name: this.name,
          description: this.description,
        });
      }
      invariant(res && res.data, 'Data should be available');
      this.updateData({
        ...res.data,
        hasPendingChanges: false,
      });
    } catch (e) {
      this.errors.add('Collection failed saving');
    } finally {
      this.isSaving = false;
    }

    return this;
  };

  updateData(data: Object = {}) {
    extendObservable(this, data);
  }

  constructor(collection: Object = {}) {
    this.updateData(collection);
    this.errors = stores.errors;
  }
}

export default Collection;
