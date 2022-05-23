import { addDays, differenceInDays } from "date-fns";
import { floor } from "lodash";
import { action, autorun, computed, observable } from "mobx";
import parseTitle from "@shared/utils/parseTitle";
import unescape from "@shared/utils/unescape";
import DocumentsStore from "~/stores/DocumentsStore";
import User from "~/models/User";
import { NavigationNode } from "~/types";
import Storage from "~/utils/Storage";
import ParanoidModel from "./ParanoidModel";
import View from "./View";
import Field from "./decorators/Field";

type SaveOptions = {
  publish?: boolean;
  done?: boolean;
  autosave?: boolean;
  lastRevision?: number;
};

export default class Document extends ParanoidModel {
  constructor(fields: Record<string, any>, store: DocumentsStore) {
    super(fields, store);

    if (this.isPersistedOnce && this.isFromTemplate) {
      this.title = "";
    }

    this.embedsDisabled = Storage.get(`embedsDisabled-${this.id}`) ?? false;

    autorun(() => {
      Storage.set(
        `embedsDisabled-${this.id}`,
        this.embedsDisabled ? true : undefined
      );
    });
  }

  @observable
  isSaving = false;

  @observable
  embedsDisabled: boolean;

  @observable
  lastViewedAt: string | undefined;

  store: DocumentsStore;

  @Field
  @observable
  collectionId: string;

  @Field
  @observable
  id: string;

  @Field
  @observable
  text: string;

  @Field
  @observable
  title: string;

  @Field
  @observable
  template: boolean;

  @Field
  @observable
  fullWidth: boolean;

  @Field
  @observable
  templateId: string | undefined;

  @Field
  @observable
  parentDocumentId: string | undefined;

  collaboratorIds: string[];

  createdBy: User;

  updatedBy: User;

  publishedAt: string | undefined;

  archivedAt: string;

  url: string;

  urlId: string;

  tasks: {
    completed: number;
    total: number;
  };

  revision: number;

  @computed
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
    element.innerText = this.title;
    element.style.visibility = "hidden";
    element.dir = "auto";

    // element must appear in body for direction to be computed
    document.body?.appendChild(element);
    const direction = window.getComputedStyle(element).direction;
    document.body?.removeChild(element);

    return direction === "rtl" ? "rtl" : "ltr";
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
  get isBadgedNew(): boolean {
    return (
      !this.lastViewedAt &&
      differenceInDays(new Date(), new Date(this.createdAt)) < 14
    );
  }

  @computed
  get isStarred(): boolean {
    return !!this.store.rootStore.stars.orderedData.find(
      (star) => star.documentId === this.id
    );
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
  get hasEmptyTitle(): boolean {
    return this.title === "";
  }

  @computed
  get titleWithDefault(): string {
    return this.title || "Untitled";
  }

  @computed
  get permanentlyDeletedAt(): string | undefined {
    if (!this.deletedAt) {
      return undefined;
    }

    return addDays(new Date(this.deletedAt), 30).toString();
  }

  @computed
  get isPersistedOnce(): boolean {
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
  updateTasks(total: number, completed: number) {
    if (total !== this.tasks.total || completed !== this.tasks.completed) {
      this.tasks = { total, completed };
    }
  }

  @action
  share = async () => {
    return this.store.rootStore.shares.create({
      documentId: this.id,
    });
  };

  archive = () => {
    return this.store.archive(this);
  };

  restore = (options?: { revisionId?: string; collectionId?: string }) => {
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
  pin = async (collectionId?: string) => {
    await this.store.rootStore.pins.create({
      documentId: this.id,
      ...(collectionId ? { collectionId } : {}),
    });
  };

  @action
  unpin = async (collectionId?: string) => {
    const pin = this.store.rootStore.pins.orderedData.find(
      (pin) =>
        pin.documentId === this.id &&
        (pin.collectionId === collectionId ||
          (!collectionId && !pin.collectionId))
    );

    await pin?.delete();
  };

  @action
  star = async () => {
    return this.store.star(this);
  };

  @action
  unstar = async () => {
    return this.store.unstar(this);
  };

  @action
  view = () => {
    // we don't record views for documents in the trash
    if (this.isDeleted) {
      return;
    }

    this.lastViewedAt = new Date().toString();

    return this.store.rootStore.views.create({
      documentId: this.id,
    });
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
  update = async (
    options: SaveOptions & {
      title?: string;
      lastRevision?: number;
    }
  ) => {
    if (this.isSaving) {
      return this;
    }
    this.isSaving = true;

    try {
      if (options.lastRevision) {
        return await this.store.update(
          {
            id: this.id,
            title: options.title || this.title,
            fullWidth: this.fullWidth,
          },
          {
            lastRevision: options.lastRevision,
            publish: options?.publish,
            done: options?.done,
          }
        );
      }

      throw new Error("Attempting to update without a lastRevision");
    } finally {
      this.isSaving = false;
    }
  };

  @action
  save = async (options?: SaveOptions | undefined) => {
    if (this.isSaving) {
      return this;
    }
    const isCreating = !this.id;
    this.isSaving = true;

    try {
      if (isCreating) {
        return await this.store.create(
          {
            parentDocumentId: this.parentDocumentId,
            collectionId: this.collectionId,
            title: this.title,
            text: this.text,
          },
          {
            publish: options?.publish,
            done: options?.done,
            autosave: options?.autosave,
          }
        );
      }

      return await this.store.update(
        {
          id: this.id,
          title: this.title,
          text: this.text,
          fullWidth: this.fullWidth,
          templateId: this.templateId,
        },
        {
          lastRevision: options?.lastRevision || this.revision,
          publish: options?.publish,
          done: options?.done,
          autosave: options?.autosave,
        }
      );
    } finally {
      this.isSaving = false;
    }
  };

  move = (collectionId: string, parentDocumentId?: string | undefined) => {
    return this.store.move(this.id, collectionId, parentDocumentId);
  };

  duplicate = () => {
    return this.store.duplicate(this);
  };

  getSummary = (paragraphs = 4) => {
    const result = this.text.trim().split("\n").slice(0, paragraphs).join("\n");
    return result;
  };

  @computed
  get pinned(): boolean {
    return !!this.store.rootStore.pins.orderedData.find(
      (pin) =>
        pin.documentId === this.id && pin.collectionId === this.collectionId
    );
  }

  @computed
  get pinnedToHome(): boolean {
    return !!this.store.rootStore.pins.orderedData.find(
      (pin) => pin.documentId === this.id && !pin.collectionId
    );
  }

  @computed
  get isActive(): boolean {
    return !this.isDeleted && !this.isTemplate && !this.isArchived;
  }

  @computed
  get asNavigationNode(): NavigationNode {
    return {
      id: this.id,
      title: this.title,
      children: this.store.orderedData
        .filter((doc) => doc.parentDocumentId === this.id)
        .map((doc) => doc.asNavigationNode),
      url: this.url,
      isDraft: this.isDraft,
    };
  }

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
    if (document.body) {
      document.body.appendChild(a);
    }
    a.href = url;
    a.download = `${this.titleWithDefault}.md`;
    a.click();
  };
}
