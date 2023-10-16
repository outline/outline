import { addDays, differenceInDays } from "date-fns";
import i18n, { t } from "i18next";
import floor from "lodash/floor";
import { action, autorun, computed, observable, set } from "mobx";
import { ExportContentType } from "@shared/types";
import type { NavigationNode } from "@shared/types";
import Storage from "@shared/utils/Storage";
import { isRTL } from "@shared/utils/rtl";
import slugify from "@shared/utils/slugify";
import DocumentsStore from "~/stores/DocumentsStore";
import User from "~/models/User";
import { client } from "~/utils/ApiClient";
import { settingsPath } from "~/utils/routeHelpers";
import View from "./View";
import ParanoidModel from "./base/ParanoidModel";
import Field from "./decorators/Field";

type SaveOptions = {
  publish?: boolean;
  done?: boolean;
  autosave?: boolean;
};

export default class Document extends ParanoidModel {
  constructor(fields: Record<string, any>, store: DocumentsStore) {
    super(fields, store);

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
  id: string;

  /**
   * The id of the collection that this document belongs to, if any.
   */
  @Field
  @observable
  collectionId?: string | null;

  /**
   * The text content of the document as Markdown.
   */
  @observable
  text: string;

  /**
   * The title of the document.
   */
  @Field
  @observable
  title: string;

  /**
   * An emoji to use as the document icon.
   */
  @Field
  @observable
  emoji: string | undefined | null;

  /**
   * Whether this is a template.
   */
  @observable
  template: boolean;

  /**
   * Whether the document layout is displayed full page width.
   */
  @Field
  @observable
  fullWidth: boolean;

  /**
   * Whether team members can see who has viewed this document.
   */
  @observable
  insightsEnabled: boolean;

  /**
   * A reference to the template that this document was created from.
   */
  @Field
  @observable
  templateId: string | undefined;

  /**
   * The id of the parent document that this is a child of, if any.
   */
  @Field
  @observable
  parentDocumentId: string | undefined;

  @observable
  collaboratorIds: string[];

  @observable
  createdBy: User;

  @observable
  updatedBy: User;

  @observable
  publishedAt: string | undefined;

  @observable
  archivedAt: string;

  /**
   * @deprecated Use path instead
   */
  @observable
  url: string;

  @observable
  urlId: string;

  @observable
  tasks: {
    completed: number;
    total: number;
  };

  @observable
  revision: number;

  /**
   * Returns the direction of the document text, either "rtl" or "ltr"
   */
  @computed
  get dir(): "rtl" | "ltr" {
    return this.rtl ? "rtl" : "ltr";
  }

  /**
   * Returns true if the document text is right-to-left
   */
  @computed
  get rtl() {
    return isRTL(this.title);
  }

  @computed
  get path(): string {
    const prefix = this.template ? settingsPath("templates") : "/doc";

    if (!this.title) {
      return `${prefix}/untitled-${this.urlId}`;
    }

    const slugifiedTitle = slugify(this.title);
    return `${prefix}/${slugifiedTitle}-${this.urlId}`;
  }

  @computed
  get noun(): string {
    return this.template ? t("template") : t("document");
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
  get collaborators(): User[] {
    return this.collaboratorIds
      .map((id) => this.store.rootStore.users.get(id))
      .filter(Boolean) as User[];
  }

  /**
   * Returns whether there is a subscription for this document in the store.
   * Does not consider remote state.
   *
   * @returns True if there is a subscription, false otherwise.
   */
  @computed
  get isSubscribed(): boolean {
    return !!this.store.rootStore.subscriptions.orderedData.find(
      (subscription) => subscription.documentId === this.id
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

  get titleWithDefault(): string {
    return this.title || i18n.t("Untitled");
  }

  @action
  updateTasks(total: number, completed: number) {
    if (total !== this.tasks.total || completed !== this.tasks.completed) {
      this.tasks = { total, completed };
    }
  }

  @action
  share = async () =>
    this.store.rootStore.shares.create({
      documentId: this.id,
    });

  archive = () => this.store.archive(this);

  restore = (options?: { revisionId?: string; collectionId?: string }) =>
    this.store.restore(this, options);

  unpublish = () => this.store.unpublish(this);

  @action
  enableEmbeds = () => {
    this.embedsDisabled = false;
  };

  @action
  disableEmbeds = () => {
    this.embedsDisabled = true;
  };

  @action
  pin = (collectionId?: string | null) =>
    this.store.rootStore.pins.create({
      documentId: this.id,
      ...(collectionId ? { collectionId } : {}),
    });

  @action
  unpin = (collectionId?: string) => {
    const pin = this.store.rootStore.pins.orderedData.find(
      (pin) =>
        pin.documentId === this.id &&
        (pin.collectionId === collectionId ||
          (!collectionId && !pin.collectionId))
    );

    return pin?.delete();
  };

  @action
  star = () => this.store.star(this);

  @action
  unstar = () => this.store.unstar(this);

  /**
   * Subscribes the current user to this document.
   *
   * @returns A promise that resolves when the subscription is created.
   */
  @action
  subscribe = () => this.store.subscribe(this);

  /**
   * Unsubscribes the current user to this document.
   *
   * @returns A promise that resolves when the subscription is destroyed.
   */
  @action
  unsubscribe = (userId: string) => this.store.unsubscribe(userId, this);

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
  templatize = () => this.store.templatize(this.id);

  @action
  save = async (
    fields?: Partial<Document> | undefined,
    options?: SaveOptions | undefined
  ) => {
    const params = fields ?? this.toAPI();
    this.isSaving = true;

    try {
      const model = await this.store.save(
        { ...params, ...fields, id: this.id },
        options
      );

      // if saving is successful set the new values on the model itself
      set(this, { ...params, ...model });

      this.persistedAttributes = this.toAPI();

      return model;
    } finally {
      this.isSaving = false;
    }
  };

  move = (collectionId: string, parentDocumentId?: string | undefined) =>
    this.store.move(this.id, collectionId, parentDocumentId);

  duplicate = (options?: { title?: string; recursive?: boolean }) =>
    this.store.duplicate(this, options);

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

  download = (contentType: ExportContentType) =>
    client.post(
      `/documents.export`,
      {
        id: this.id,
      },
      {
        download: true,
        headers: {
          accept: contentType,
        },
      }
    );
}
