// @flow
import { extendObservable, action, computed, runInAction } from 'mobx';
import invariant from 'invariant';

import BaseModel from 'models/BaseModel';
import Document from 'models/Document';
import { client } from 'utils/ApiClient';
import stores from 'stores';
import UiStore from 'stores/UiStore';
import type { NavigationNode } from 'types';

class Collection extends BaseModel {
  isSaving: boolean = false;
  ui: UiStore;

  createdAt: string;
  description: string;
  id: string;
  name: string;
  color: string;
  type: 'atlas' | 'journal';
  documents: NavigationNode[];
  updatedAt: string;
  url: string;

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

  @action
  updateDocument(document: Document) {
    const travelDocuments = (documentList, path) =>
      documentList.forEach(d => {
        if (d.id === document.id) {
          d.title = document.title;
          d.url = document.url;
        } else {
          travelDocuments(d.children);
        }
      });

    travelDocuments(this.documents);
  }

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
      this.ui.showToast('Collection failed loading');
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
      });
    } catch (e) {
      this.ui.showToast('Collection failed saving');
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
      this.emit('collections.delete', { id: this.id });
      return true;
    } catch (e) {
      this.ui.showToast('Collection failed to delete');
    }
    return false;
  };

  @action
  export = async () => {
    await client.post('/collections.export', { id: this.id });
  };

  @action
  updateData(data: Object = {}) {
    extendObservable(this, data);
  }

  constructor(collection: $Shape<Collection>) {
    super();

    this.updateData(collection);
    this.ui = stores.ui;

    this.on('documents.delete', (data: { collectionId: string }) => {
      if (data.collectionId === this.id) this.fetch();
    });
    this.on(
      'documents.update',
      (data: { collectionId: string, document: Document }) => {
        if (data.collectionId === this.id) {
          this.updateDocument(data.document);
        }
      }
    );
    this.on('documents.publish', (data: { collectionId: string }) => {
      if (data.collectionId === this.id) this.fetch();
    });
    this.on('documents.move', (data: { collectionId: string }) => {
      if (data.collectionId === this.id) this.fetch();
    });
  }
}

export default Collection;
