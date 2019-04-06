// @flow
import { action, set, computed } from 'mobx';
import invariant from 'invariant';

import { client } from 'utils/ApiClient';
import parseTitle from 'shared/utils/parseTitle';
import unescape from 'shared/utils/unescape';

import type { NavigationNode } from 'types';
import BaseModel from 'models/BaseModel';
import Revision from 'models/Revision';
import User from 'models/User';
import Collection from 'models/Collection';

type SaveOptions = { publish?: boolean, done?: boolean, autosave?: boolean };

export default class Document extends BaseModel {
  isSaving: boolean;
  ui: *;
  store: *;

  collaborators: User[];
  collection: Collection;
  collectionId: string;
  lastViewedAt: ?string;
  createdAt: string;
  createdBy: User;
  updatedAt: string;
  updatedBy: User;
  id: string;
  team: string;
  starred: boolean;
  pinned: boolean;
  text: string;
  title: string;
  emoji: string;
  parentDocument: ?string;
  publishedAt: ?string;
  archivedAt: string;
  deletedAt: ?string;
  url: string;
  urlId: string;
  shareUrl: ?string;
  revision: number;

  constructor(data?: Object = {}, store: *) {
    super(data, store);
    this.updateTitle();
  }

  @action
  updateTitle() {
    set(this, parseTitle(this.text));
  }

  @computed
  get modifiedSinceViewed(): boolean {
    return !!this.lastViewedAt && this.lastViewedAt < this.updatedAt;
  }

  @computed
  get pathToDocument(): NavigationNode[] {
    let path;
    const traveler = (nodes, previousPath) => {
      nodes.forEach(childNode => {
        const newPath = [...previousPath, childNode];
        if (childNode.id === this.id) {
          path = newPath;
          return;
        }
        return traveler(childNode.children, newPath);
      });
    };

    if (this.collection && this.collection.documents) {
      traveler(this.collection.documents, []);
      if (path) return path;
    }

    return [];
  }

  @computed
  get isArchived(): boolean {
    return !!this.archivedAt;
  }

  @computed
  get isDeleted(): boolean {
    return !!this.deletedAt;
  }

  @computed
  get isDraft(): boolean {
    return !this.publishedAt;
  }

  @computed
  get isEmpty(): boolean {
    // Check if the document title has been modified and user generated content exists
    return this.text.replace(/^#/, '').trim().length === 0;
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

  @action
  share = async () => {
    const res = await client.post('/shares.create', { documentId: this.id });
    invariant(res && res.data, 'Share data should be available');
    this.shareUrl = res.data.url;
    return this.shareUrl;
  };

  @action
  updateFromJson = data => {
    set(this, data);
    this.updateTitle();
  };

  archive = () => {
    return this.store.archive(this);
  };

  restore = (revision: ?Revision) => {
    return this.store.restore(this, revision);
  };

  @action
  pin = async () => {
    this.pinned = true;
    try {
      await this.store.pin(this);
    } catch (err) {
      this.pinned = false;
      throw err;
    }
  };

  @action
  unpin = async () => {
    this.pinned = false;
    try {
      await this.store.unpin(this);
    } catch (err) {
      this.pinned = true;
      throw err;
    }
  };

  @action
  star = async () => {
    this.starred = true;
    try {
      await this.store.star(this);
    } catch (err) {
      this.starred = false;
      throw err;
    }
  };

  @action
  unstar = async () => {
    this.starred = false;
    try {
      await this.store.unstar(this);
    } catch (err) {
      this.starred = true;
      throw err;
    }
  };

  @action
  view = async () => {
    await client.post('/views.create', { documentId: this.id });
  };

  @action
  fetch = async () => {
    const res = await client.post('/documents.info', { id: this.id });
    invariant(res && res.data, 'Data should be available');
    this.updateFromJson(res.data);
  };

  @action
  save = async (options: SaveOptions) => {
    if (this.isSaving) return this;

    const isCreating = !this.id;
    const wasDraft = !this.publishedAt;
    this.isSaving = true;
    this.updateTitle();

    try {
      if (isCreating) {
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
        const document = await this.store.create(data);
        return document;
      } else {
        const document = await this.store.update({
          id: this.id,
          title: this.title,
          text: this.text,
          lastRevision: this.revision,
          ...options,
        });
        return document;
      }
    } finally {
      if (wasDraft && options.publish) {
        this.store.rootStore.collections.fetch(this.collection.id, {
          force: true,
        });
      }
      this.isSaving = false;
    }
  };

  move = (parentDocumentId: ?string) => {
    return this.store.move(this, parentDocumentId);
  };

  duplicate = () => {
    return this.store.duplicate(this);
  };

  download = async () => {
    // Ensure the document is upto date with latest server contents
    await this.fetch();

    const blob = new Blob([unescape(this.text)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // Firefox support requires the anchor tag be in the DOM to trigger the dl
    if (document.body) document.body.appendChild(a);
    a.href = url;
    a.download = `${this.title}.md`;
    a.click();
  };
}
