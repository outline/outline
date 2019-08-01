// @flow
import { action, set, computed } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import parseTitle from 'shared/utils/parseTitle';
import unescape from 'shared/utils/unescape';
import BaseModel from 'models/BaseModel';
import Revision from 'models/Revision';
import User from 'models/User';

type SaveOptions = { publish?: boolean, done?: boolean, autosave?: boolean };

export default class Document extends BaseModel {
  isSaving: boolean;
  ui: *;
  store: *;

  collaborators: User[];
  collectionId: string;
  lastViewedAt: ?string;
  createdAt: string;
  createdBy: User;
  updatedAt: string;
  updatedBy: User;
  id: string;
  team: string;
  pinned: boolean;
  text: string;
  title: string;
  emoji: string;
  parentDocumentId: ?string;
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
  get isStarred(): boolean {
    return this.store.starredIds.get(this.id);
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
  star = () => {
    return this.store.star(this);
  };

  @action
  unstar = async () => {
    return this.store.unstar(this);
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
        return await this.store.create({
          parentDocumentId: this.parentDocumentId,
          collectionId: this.collectionId,
          title: this.title,
          text: this.text,
          ...options,
        });
      }

      return await this.store.update({
        id: this.id,
        title: this.title,
        text: this.text,
        lastRevision: this.revision,
        ...options,
      });
    } finally {
      if (wasDraft && options.publish) {
        this.store.rootStore.collections.fetch(this.collectionId, {
          force: true,
        });
      }
      this.isSaving = false;
    }
  };

  move = (collectionId: string, parentDocumentId: ?string) => {
    return this.store.move(this, collectionId, parentDocumentId);
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
