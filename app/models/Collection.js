// @flow
import { extendObservable, action, computed, runInAction } from 'mobx';
import invariant from 'invariant';
import _ from 'lodash';

import BaseModel from 'models/BaseModel';
import { client } from 'utils/ApiClient';
import stores from 'stores';
import ErrorsStore from 'stores/ErrorsStore';
import type { NavigationNode } from 'types';

class Collection extends BaseModel {
  isSaving: boolean = false;
  hasPendingChanges: boolean = false;
  errors: ErrorsStore;
  data: Object;

  createdAt: string;
  description: ?string;
  id: string;
  name: string;
  color: string;
  type: 'atlas' | 'journal';
  documents: Array<NavigationNode>;
  updatedAt: string;
  url: string;

  /* Computed */

  @computed
  get entryUrl(): string {
    return this.type === 'atlas' && this.documents.length > 0
      ? this.documents[0].url
      : this.url;
  }

  @computed
  get allowDelete(): boolean {
    return true;
  }

  @computed
  get isEmpty(): boolean {
    return this.documents.length === 0;
  }

  @computed
  get documentIds(): string[] {
    const results = [];
    const travelDocuments = (documentList, path) =>
      documentList.forEach(document => {
        results.push(document.id);
        travelDocuments(document.children);
      });

    travelDocuments(this.documents);
    return results;
  }

  /* Actions */

  @action
  fetch = async () => {
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

  @action
  save = async () => {
    if (this.isSaving) return this;
    this.isSaving = true;

    const params = {
      name: this.name,
      color: this.color,
      description: this.description,
    };

    try {
      let res;
      if (this.id) {
        res = await client.post('/collections.update', {
          id: this.id,
          ...params,
        });
      } else {
        res = await client.post('/collections.create', params);
      }
      runInAction('Collection#save', () => {
        invariant(res && res.data, 'Data should be available');
        this.updateData(res.data);
        this.hasPendingChanges = false;
      });
    } catch (e) {
      this.errors.add('Collection failed saving');
      return false;
    } finally {
      this.isSaving = false;
    }

    return true;
  };

  @action
  delete = async () => {
    try {
      await client.post('/collections.delete', { id: this.id });
      this.emit('collections.delete', {
        id: this.id,
      });
      return true;
    } catch (e) {
      this.errors.add('Collection failed to delete');
    }
    return false;
  };

  @action
  updateData(data: Object = {}) {
    this.data = data;
    extendObservable(this, data);
  }

  constructor(collection: Object = {}) {
    super();

    this.updateData(collection);
    this.errors = stores.errors;

    this.on('documents.delete', (data: { collectionId: string }) => {
      if (data.collectionId === this.id) this.fetch();
    });
    this.on(
      'collections.update',
      (data: { id: string, collection: Collection }) => {
        // FIXME: calling this.updateData won't update the
        // UI. Some mobx issue
        if (data.id === this.id) this.fetch();
      }
    );
    this.on('documents.move', (data: { collectionId: string }) => {
      if (data.collectionId === this.id) this.fetch();
    });
  }
}

export default Collection;
