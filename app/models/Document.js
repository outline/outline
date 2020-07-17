// @flow
import { action, set, observable, computed } from "mobx";
import addDays from "date-fns/add_days";
import invariant from "invariant";
import { client } from "utils/ApiClient";
import parseTitle from "shared/utils/parseTitle";
import unescape from "shared/utils/unescape";
import BaseModel from "models/BaseModel";
import Revision from "models/Revision";
import User from "models/User";
import DocumentsStore from "stores/DocumentsStore";

type SaveOptions = {
  publish?: boolean,
  done?: boolean,
  autosave?: boolean,
  lastRevision?: number,
};

export default class Document extends BaseModel {
  @observable isSaving: boolean = false;
  @observable embedsDisabled: boolean = false;
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

  get emoji() {
    const { emoji } = parseTitle(this.title);
    return emoji;
  }

  @computed
  get isOnlyTitle(): boolean {
    return !this.text.trim();
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
    const res = await client.post("/shares.create", { documentId: this.id });
    invariant(res && res.data, "Share data should be available");
    this.shareUrl = res.data.url;
    return this.shareUrl;
  };

  @action
  updateFromJson = data => {
    set(this, data);
  };

  archive = () => {
    return this.store.archive(this);
  };

  restore = (revision: Revision) => {
    return this.store.restore(this, revision);
  };

  @action
  enableEmbeds = () => {
    this.embedsDisabled = false;
  };

  @action
  disableEmbeds = () => {
    this.embedsDisabled = true;
  };

  @action
  pin = async () => {
    this.pinned = true;
    try {
      const res = await this.store.pin(this);
      invariant(res && res.data, "Data should be available");
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
      invariant(res && res.data, "Data should be available");
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
    const res = await client.post("/documents.info", { id: this.id });
    invariant(res && res.data, "Data should be available");
    this.updateFromJson(res.data);
  };

  @action
  save = async (options: SaveOptions) => {
    if (this.isSaving) return this;

    const isCreating = !this.id;
    this.isSaving = true;

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

      if (options.lastRevision) {
        return await this.store.update({
          id: this.id,
          title: this.title,
          text: this.text,
          lastRevision: options.lastRevision,
          ...options,
        });
      }

      throw new Error("Attempting to update without a lastRevision");
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

  getSummary = (paragraphs: number = 4) => {
    const result = this.text
      .trim()
      .split("\n")
      .slice(0, paragraphs)
      .join("\n");

    return result;
  };

  download = async () => {
    // Ensure the document is upto date with latest server contents
    await this.fetch();

    const body = unescape(this.text);
    const blob = new Blob([`# ${this.title}\n\n${body}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    // Firefox support requires the anchor tag be in the DOM to trigger the dl
    if (document.body) document.body.appendChild(a);
    a.href = url;
    a.download = `${this.title || "Untitled"}.md`;
    a.click();
  };
}
