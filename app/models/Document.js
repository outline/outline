// @flow
import { addDays, differenceInDays } from "date-fns";
import invariant from "invariant";
import { floor } from "lodash";
import { action, computed, observable, set } from "mobx";
import parseTitle from "shared/utils/parseTitle";
import unescape from "shared/utils/unescape";
import DocumentsStore from "stores/DocumentsStore";
import BaseModel from "models/BaseModel";
import User from "models/User";
import View from "./View";

type SaveOptions = {|
  publish?: boolean,
  done?: boolean,
  autosave?: boolean,
  lastRevision?: number,
|};

export default class Document extends BaseModel {
  @observable isSaving: boolean = false;
  @observable embedsDisabled: boolean = false;
  @observable lastViewedAt: ?string;
  store: DocumentsStore;

  collaboratorIds: string[];
  collectionId: string;
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
  template: boolean;
  templateId: ?string;
  parentDocumentId: ?string;
  publishedAt: ?string;
  archivedAt: string;
  deletedAt: ?string;
  url: string;
  urlId: string;
  tasks: { completed: number, total: number };
  revision: number;

  constructor(fields: Object, store: DocumentsStore) {
    super(fields, store);

    if (this.isNewDocument && this.isFromTemplate) {
      this.title = "";
    }
  }

  get emoji() {
    const { emoji } = parseTitle(this.title);
    return emoji;
  }

  /**
   * Best-guess the text direction of the document based on the language the
   * title is written in. Note: wrapping as a computed getter means that it will
   * only be called directly when the title changes.
   */
  @computed
  get dir(): "rtl" | "ltr" {
    const element = document.createElement("p");
    element.innerHTML = this.title;
    element.style.visibility = "hidden";
    element.dir = "auto";

    // element must appear in body for direction to be computed
    document.body?.appendChild(element);

    const direction = window.getComputedStyle(element).direction;
    document.body?.removeChild(element);
    return direction;
  }

  @computed
  get noun(): string {
    return this.template ? "template" : "document";
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
  get isNew(): boolean {
    return (
      !this.lastViewedAt &&
      differenceInDays(new Date(), new Date(this.createdAt)) < 14
    );
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
  get isTemplate(): boolean {
    return !!this.template;
  }

  @computed
  get isDraft(): boolean {
    return !this.publishedAt;
  }

  @computed
  get titleWithDefault(): string {
    return this.title || "Untitled";
  }

  @computed
  get permanentlyDeletedAt(): ?string {
    if (!this.deletedAt) {
      return undefined;
    }

    return addDays(new Date(this.deletedAt), 30).toString();
  }

  @computed
  get isNewDocument(): boolean {
    return this.createdAt === this.updatedAt;
  }

  @computed
  get isFromTemplate(): boolean {
    return !!this.templateId;
  }

  @computed
  get isTasks(): boolean {
    return !!this.tasks.total;
  }

  @computed
  get tasksPercentage(): number {
    if (!this.isTasks) {
      return 0;
    }
    return floor((this.tasks.completed / this.tasks.total) * 100);
  }

  @action
  share = async () => {
    return this.store.rootStore.shares.create({ documentId: this.id });
  };

  @action
  updateFromJson = (data: Object) => {
    set(this, data);
  };

  archive = () => {
    return this.store.archive(this);
  };

  restore = (options: { revisionId?: string, collectionId?: string }) => {
    return this.store.restore(this, options);
  };

  unpublish = () => {
    return this.store.unpublish(this);
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
    // we don't record views for documents in the trash
    if (this.isDeleted || !this.publishedAt) {
      return;
    }

    return this.store.rootStore.views.create({ documentId: this.id });
  };

  @action
  updateLastViewed = (view: View) => {
    this.lastViewedAt = view.lastViewedAt;
  };

  @action
  templatize = async () => {
    return this.store.templatize(this.id);
  };

  @action
  update = async (options: {| ...SaveOptions, title: string |}) => {
    if (this.isSaving) return this;
    this.isSaving = true;

    try {
      if (options.lastRevision) {
        return await this.store.update({
          id: this.id,
          title: this.title,
          lastRevision: options.lastRevision,
          ...options,
        });
      }

      throw new Error("Attempting to update without a lastRevision");
    } finally {
      this.isSaving = false;
    }
  };

  @action
  save = async (options: ?SaveOptions) => {
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
          publish: options?.publish,
          done: options?.done,
          autosave: options?.autosave,
        });
      }

      if (options?.lastRevision) {
        return await this.store.update({
          id: this.id,
          title: this.title,
          text: this.text,
          templateId: this.templateId,
          lastRevision: options?.lastRevision,
          publish: options?.publish,
          done: options?.done,
          autosave: options?.autosave,
        });
      }

      throw new Error("Attempting to update without a lastRevision");
    } finally {
      this.isSaving = false;
    }
  };

  move = (collectionId: string, parentDocumentId: ?string) => {
    return this.store.move(this.id, collectionId, parentDocumentId);
  };

  duplicate = () => {
    return this.store.duplicate(this);
  };

  getSummary = (paragraphs: number = 4) => {
    const result = this.text.trim().split("\n").slice(0, paragraphs).join("\n");

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
    a.download = `${this.titleWithDefault}.md`;
    a.click();
  };
}
