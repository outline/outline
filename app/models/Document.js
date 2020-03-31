// @flow
import { action, set, computed } from 'mobx';
import pkg from 'rich-markdown-editor/package.json';
import addDays from 'date-fns/add_days';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import parseTitle from 'shared/utils/parseTitle';
import unescape from 'shared/utils/unescape';
import BaseModel from 'models/BaseModel';
import Revision from 'models/Revision';
import User from 'models/User';
import DocumentsStore from 'stores/DocumentsStore';

type SaveOptions = { publish?: boolean, done?: boolean, autosave?: boolean };

export default class Document extends BaseModel {
  isSaving: boolean;
  store: DocumentsStore;

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

  constructor(data?: Object = {}, store: DocumentsStore) {
    super(data, store);
    this.updateTitle();
  }

  @action
  updateTitle() {
    const { title, emoji } = parseTitle(this.text);

    if (title) {
      set(this, { title, emoji });
    }
  }

  @computed
  get isOnlyTitle(): boolean {
    const { title } = parseTitle(this.text);

    // find and extract title
    const trimmedBody = this.text
      .trim()
      .replace(/^#/, '')
      .trim();

    return unescape(trimmedBody) === title;
  }

  @computed
  get modifiedSinceViewed(): boolean {
    return !!this.lastViewedAt && this.lastViewedAt < this.updatedAt;
  }

  @computed
  get isStarred(): boolean {
    return !!this.store.starredIds.get(this.id);
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
  get permanentlyDeletedAt(): ?string {
    if (!this.deletedAt) {
      return undefined;
    }

    return addDays(new Date(this.deletedAt), 30).toString();
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

  restore = (revision: Revision) => {
    return this.store.restore(this, revision);
  };

  @action
  pin = async () => {
    this.pinned = true;
    try {
      const res = await this.store.pin(this);
      invariant(res && res.data, 'Data should be available');
      this.updateFromJson(res.data);
    } catch (err) {
      this.pinned = false;
      throw err;
    }
  };

  @action
  unpin = async () => {
    this.pinned = false;
    try {
      const res = await this.store.unpin(this);
      invariant(res && res.data, 'Data should be available');
      this.updateFromJson(res.data);
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
  view = () => {
    return this.store.rootStore.views.create({ documentId: this.id });
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
    this.isSaving = true;
    this.updateTitle();

    try {
      if (isCreating) {
        return await this.store.create({
          editorVersion: pkg.version,
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
        editorVersion: pkg.version,
        ...options,
      });
    } finally {
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
