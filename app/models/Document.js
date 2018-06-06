// @flow
import { extendObservable, action, runInAction, computed } from 'mobx';
import invariant from 'invariant';

import { client } from 'utils/ApiClient';
import stores from 'stores';
import UiStore from 'stores/UiStore';
import parseTitle from '../../shared/utils/parseTitle';

import type { User } from 'types';
import BaseModel from './BaseModel';
import Collection from './Collection';

type SaveOptions = { publish?: boolean, done?: boolean, autosave?: boolean };

class Document extends BaseModel {
  isSaving: boolean = false;
  hasPendingChanges: boolean = false;
  ui: UiStore;

  collaborators: User[];
  collection: $Shape<Collection>;
  collectionId: string;
  firstViewedAt: ?string;
  lastViewedAt: ?string;
  modifiedSinceViewed: ?boolean;
  createdAt: string;
  createdBy: User;
  updatedAt: string;
  updatedBy: User;
  html: string;
  id: string;
  team: string;
  emoji: string;
  starred: boolean = false;
  pinned: boolean = false;
  text: string = '';
  title: string = '';
  parentDocument: ?string;
  publishedAt: ?string;
  url: string;
  shareUrl: ?string;
  views: number;
  revision: number;

  /* Computed */

  @computed
  get modifiedSinceViewed(): boolean {
    return !!this.lastViewedAt && this.lastViewedAt < this.updatedAt;
  }

  @computed
  get pathToDocument(): Array<{ id: string, title: string }> {
    let path;
    const traveler = (nodes, previousPath) => {
      nodes.forEach(childNode => {
        const newPath = [
          ...previousPath,
          {
            id: childNode.id,
            title: childNode.title,
          },
        ];
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
      if (path) return path;
    }

    return [];
  }

  @computed
  get isEmpty(): boolean {
    // Check if the document title has been modified and user generated content exists
    return this.text.replace(new RegExp(`^#$`), '').trim().length === 0;
  }

  @computed
  get allowSave(): boolean {
    return !this.isEmpty && !this.isSaving;
  }

  @computed
  get parentDocumentId(): ?string {
    return this.pathToDocument.length > 1
      ? this.pathToDocument[this.pathToDocument.length - 2].id
      : null;
  }

  /* Actions */

  @action
  share = async () => {
    try {
      const res = await client.post('/shares.create', { documentId: this.id });
      invariant(res && res.data, 'Document API response should be available');

      this.shareUrl = res.data.url;
    } catch (e) {
      this.ui.showToast('Document failed to share');
    }
  };

  @action
  pin = async () => {
    this.pinned = true;
    try {
      await client.post('/documents.pin', { id: this.id });
    } catch (e) {
      this.pinned = false;
      this.ui.showToast('Document failed to pin');
    }
  };

  @action
  unpin = async () => {
    this.pinned = false;
    try {
      await client.post('/documents.unpin', { id: this.id });
    } catch (e) {
      this.pinned = true;
      this.ui.showToast('Document failed to unpin');
    }
  };

  @action
  star = async () => {
    this.starred = true;
    try {
      await client.post('/documents.star', { id: this.id });
    } catch (e) {
      this.starred = false;
      this.ui.showToast('Document failed star');
    }
  };

  @action
  unstar = async () => {
    this.starred = false;
    try {
      await client.post('/documents.unstar', { id: this.id });
    } catch (e) {
      this.starred = false;
      this.ui.showToast('Document failed unstar');
    }
  };

  @action
  view = async () => {
    this.views++;
    try {
      await client.post('/views.create', { id: this.id });
    } catch (e) {
      this.ui.showToast('Document failed to record view');
    }
  };

  @action
  fetch = async () => {
    try {
      const res = await client.post('/documents.info', { id: this.id });
      invariant(res && res.data, 'Document API response should be available');
      const { data } = res;
      runInAction('Document#update', () => {
        this.updateData(data);
      });
    } catch (e) {
      this.ui.showToast('Document failed loading');
    }
  };

  @action
  save = async (options: SaveOptions) => {
    if (this.isSaving) return this;

    const wasDraft = !this.publishedAt;
    this.isSaving = true;

    try {
      let res;
      if (this.id) {
        res = await client.post('/documents.update', {
          id: this.id,
          title: this.title,
          text: this.text,
          lastRevision: this.revision,
          ...options,
        });
      } else {
        const data = {
          parentDocument: undefined,
          collection: this.collection.id,
          title: this.title,
          text: this.text,
          ...options,
        };
        if (this.parentDocument) {
          data.parentDocument = this.parentDocument;
        }
        res = await client.post('/documents.create', data);
        if (res && res.data) this.emit('documents.create', res.data);
      }
      runInAction('Document#save', () => {
        invariant(res && res.data, 'Data should be available');
        this.updateData(res.data);
        this.hasPendingChanges = false;
      });

      this.emit('documents.update', {
        document: this,
        collectionId: this.collection.id,
      });

      if (wasDraft && this.publishedAt) {
        this.emit('documents.publish', {
          id: this.id,
          collectionId: this.collection.id,
        });
      }
    } catch (e) {
      this.ui.showToast('Document failed to save');
    } finally {
      this.isSaving = false;
    }

    return this;
  };

  @action
  move = async (parentDocumentId: ?string) => {
    try {
      const res = await client.post('/documents.move', {
        id: this.id,
        parentDocument: parentDocumentId,
      });
      invariant(res && res.data, 'Data not available');
      this.updateData(res.data);
      this.emit('documents.move', {
        id: this.id,
        collectionId: this.collection.id,
      });
    } catch (e) {
      this.ui.showToast('Error while moving the document');
    }
    return;
  };

  @action
  delete = async () => {
    try {
      await client.post('/documents.delete', { id: this.id });
      this.emit('documents.delete', {
        id: this.id,
        collectionId: this.collection.id,
      });
      return true;
    } catch (e) {
      this.ui.showToast('Error while deleting the document');
    }
    return false;
  };

  duplicate = () => {
    this.emit('documents.duplicate', this);
  };

  download() {
    const a = window.document.createElement('a');
    a.textContent = 'download';
    a.download = `${this.title}.md`;
    a.href = `data:text/markdown;charset=UTF-8,${encodeURIComponent(
      this.text
    )}`;
    a.click();
  }

  updateData(data: Object = {}, dirty: boolean = false) {
    if (data.text) {
      const { title, emoji } = parseTitle(data.text);
      data.title = title;
      data.emoji = emoji;
    }
    if (dirty) this.hasPendingChanges = true;
    extendObservable(this, data);
  }

  constructor(data?: Object = {}) {
    super();

    this.updateData(data);
    this.ui = stores.ui;
  }
}

export default Document;
