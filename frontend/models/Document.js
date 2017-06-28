// @flow
import { extendObservable, action, runInAction, computed } from 'mobx';
import invariant from 'invariant';

import ApiClient, { client } from 'utils/ApiClient';
import stores from 'stores';
import ErrorsStore from 'stores/ErrorsStore';

import type { User } from 'types';
import Collection from './Collection';

class Document {
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
  title: string;
  updatedAt: string;
  updatedBy: User;
  url: string;
  views: number;

  client: ApiClient;
  errors: ErrorsStore;

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

  @action update = async () => {
    try {
      const res = await this.client.post('/documents.info', { id: this.id });
      invariant(res && res.data, 'Document API response should be available');
      const { data } = res;
      runInAction('Document#update', () => {
        this.updateData(data);
      });
    } catch (e) {
      this.errors.add('Document failed loading');
    }
  };

  updateData(data: Document) {
    extendObservable(this, data);
  }

  constructor(document: Document) {
    this.updateData(document);
    this.client = client;
    this.errors = stores.errors;
  }
}

export default Document;
