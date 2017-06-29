// @flow
import { extendObservable, action, runInAction, computed } from 'mobx';
import invariant from 'invariant';

import { client } from 'utils/ApiClient';
import stores from 'stores';
import ErrorsStore from 'stores/ErrorsStore';

import type { User } from 'types';
import Collection from './Collection';

const parseHeader = text => {
  const firstLine = text.split(/\r?\n/)[0];
  return firstLine.replace(/^#/, '').trim();
};

class Document {
  isSaving: boolean;
  hasPendingChanges: boolean = false;
  errors: ErrorsStore;

  collaborators: Array<User>;
  collection: Collection;
  createdAt: string;
  createdBy: User;
  html: string;
  id: string;
  private: boolean;
  starred: boolean;
  team: string;
  text: string;
  title: string = 'Untitled document';
  updatedAt: string;
  updatedBy: User;
  url: string;
  views: number;

  /* Computed */

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
    try {
      await client.post('/views.create', { id: this.id });
      this.views++;
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
    if (this.isSaving) return;
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
        res = await client.post('/documents.create', {
          collection: this.collection.id,
          title: this.title,
          text: this.text,
        });
      }

      invariant(res && res.data, 'Data should be available');
      this.hasPendingChanges = false;
    } catch (e) {
      this.errors.add('Document failed saving');
    } finally {
      this.isSaving = false;
    }
  };

  updateData(data: Object | Document) {
    data.title = parseHeader(data.text);
    extendObservable(this, data);
  }

  constructor(document: Document) {
    this.updateData(document);
    this.errors = stores.errors;
  }
}

export default Document;
