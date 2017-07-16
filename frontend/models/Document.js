// @flow
import { extendObservable, action, runInAction, computed } from 'mobx';
import invariant from 'invariant';

import { client } from 'utils/ApiClient';
import stores from 'stores';
import ErrorsStore from 'stores/ErrorsStore';

import type { User } from 'types';
import Collection from './Collection';

const parseHeader = text => {
  const firstLine = text.trim().split(/\r?\n/)[0];
  return firstLine.replace(/^#/, '').trim();
};

class Document {
  isSaving: boolean = false;
  hasPendingChanges: boolean = false;
  errors: ErrorsStore;

  collaborators: Array<User>;
  collection: $Shape<Collection>;
  firstViewedAt: ?string;
  lastViewedAt: ?string;
  modifiedSinceViewed: ?boolean;
  createdAt: string;
  createdBy: User;
  html: string;
  id: string;
  team: string;
  private: boolean = false;
  starred: boolean = false;
  text: string = '';
  title: string = 'Untitled document';
  parentDocument: ?Document;
  updatedAt: string;
  updatedBy: User;
  url: string;
  views: number;

  /* Computed */

  @computed get modifiedSinceViewed(): boolean {
    return !!this.lastViewedAt && this.lastViewedAt < this.updatedAt;
  }

  @computed get pathToDocument(): Array<string> {
    let path;
    const traveler = (nodes, previousPath) => {
      nodes.forEach(childNode => {
        const newPath = [...previousPath, childNode.id];
        if (childNode.id === this.id) {
          path = newPath;
          return;
        } else {
          return traveler(childNode.children, newPath);
        }
      });
    };

    if (this.collection.documents) {
      traveler(this.collection.documents, []);
      invariant(path, 'Path is not available for collection, abort');
      return path;
    }

    return [];
  }

  /* Actions */

  @action star = async () => {
    this.starred = true;
    try {
      await client.post('/documents.star', { id: this.id });
    } catch (e) {
      this.starred = false;
      this.errors.add('Document failed star');
    }
  };

  @action unstar = async () => {
    this.starred = false;
    try {
      await client.post('/documents.unstar', { id: this.id });
    } catch (e) {
      this.starred = false;
      this.errors.add('Document failed unstar');
    }
  };

  @action view = async () => {
    this.views++;
    try {
      await client.post('/views.create', { id: this.id });
    } catch (e) {
      this.errors.add('Document failed to record view');
    }
  };

  @action delete = async () => {
    try {
      await client.post('/documents.delete', { id: this.id });
    } catch (e) {
      this.errors.add('Document failed to delete');
    }
  };

  @action fetch = async () => {
    try {
      const res = await client.post('/documents.info', { id: this.id });
      invariant(res && res.data, 'Document API response should be available');
      const { data } = res;
      runInAction('Document#update', () => {
        this.updateData(data);
      });
    } catch (e) {
      this.errors.add('Document failed loading');
    }
  };

  @action save = async () => {
    if (this.isSaving) return this;
    this.isSaving = true;

    try {
      let res;
      if (this.id) {
        res = await client.post('/documents.update', {
          id: this.id,
          title: this.title,
          text: this.text,
        });
      } else {
        const data = {
          parentDocument: undefined,
          collection: this.collection.id,
          title: this.title,
          text: this.text,
        };
        // if (this.parentDocument) {
        //   data.parentDocument = this.parentDocument.id;
        // }
        res = await client.post('/documents.create', data);
      }

      invariant(res && res.data, 'Data should be available');
      this.updateData({
        ...res.data,
        hasPendingChanges: false,
      });
    } catch (e) {
      this.errors.add('Document failed saving');
    } finally {
      this.isSaving = false;
    }

    return this;
  };

  updateData(data: Object = {}, dirty: boolean = false) {
    if (data.text) data.title = parseHeader(data.text);
    if (dirty) data.hasPendingChanges = true;
    extendObservable(this, data);
  }

  constructor(data?: Object = {}) {
    this.updateData(data);
    this.errors = stores.errors;
  }
}

export default Document;
