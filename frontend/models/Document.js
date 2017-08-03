// @flow
import { extendObservable, action, runInAction, computed } from 'mobx';
import invariant from 'invariant';

import { client } from 'utils/ApiClient';
import stores from 'stores';
import ErrorsStore from 'stores/ErrorsStore';
import parseTitle from '../../shared/parseTitle';

import type { User } from 'types';
import BaseModel from './BaseModel';
import Collection from './Collection';

const DEFAULT_TITLE = 'Untitled document';

class Document extends BaseModel {
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
  emoji: string;
  private: boolean = false;
  starred: boolean = false;
  text: string = '';
  title: string = '';
  parentDocument: ?Document;
  updatedAt: string;
  updatedBy: User;
  url: string;
  views: number;

  data: Object;

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

  @computed get isEmpty(): boolean {
    // Check if the document title has been modified and user generated content exists
    return this.text.replace(new RegExp(`^#$`), '').trim().length === 0;
  }

  @computed get allowSave(): boolean {
    return !this.isEmpty && !this.isSaving;
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
        if (!this.title) {
          this.title = DEFAULT_TITLE;
          this.text = this.text.replace(
            new RegExp(`^# `),
            `# ${DEFAULT_TITLE}`
          );
        }

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
      });
      this.hasPendingChanges = false;
    } catch (e) {
      this.errors.add('Document failed saving');
    } finally {
      this.isSaving = false;
    }

    return this;
  };

  @action delete = async () => {
    try {
      await client.post('/documents.delete', { id: this.id });
      this.emit('document.delete', {
        id: this.id,
        collectionId: this.collection.id,
      });
    } catch (e) {
      this.errors.add('Error while deleting the document');
    }
    return;
  };

  updateData(data: Object = {}, dirty: boolean = false) {
    if (data.text) {
      const { title, emoji } = parseTitle(data.text);
      data.title = title;
      data.emoji = emoji;
    }
    if (dirty) this.hasPendingChanges = true;
    this.data = data;
    extendObservable(this, data);
  }

  constructor(data?: Object = {}) {
    super();

    this.updateData(data);
    this.errors = stores.errors;
  }
}

export default Document;
