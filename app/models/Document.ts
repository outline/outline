import { addDays, differenceInDays } from "date-fns";
import i18n, { t } from "i18next";
import capitalize from "lodash/capitalize";
import floor from "lodash/floor";
import { action, autorun, computed, observable, set } from "mobx";
import { Node, Schema } from "prosemirror-model";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import { richExtensions, withComments } from "@shared/editor/nodes";
import type {
  JSONObject,
  NavigationNode,
  ProsemirrorData,
} from "@shared/types";
import {
  ExportContentType,
  FileOperationFormat,
  NavigationNodeType,
  NotificationEventType,
} from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import Storage from "@shared/utils/Storage";
import { isRTL } from "@shared/utils/rtl";
import slugify from "@shared/utils/slugify";
import DocumentsStore from "~/stores/DocumentsStore";
import User from "~/models/User";
import type { Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import { settingsPath } from "~/utils/routeHelpers";
import Collection from "./Collection";
import Notification from "./Notification";
import Pin from "./Pin";
import View from "./View";
import ArchivableModel from "./base/ArchivableModel";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import { Searchable } from "./interfaces/Searchable";

type SaveOptions = JSONObject & {
  publish?: boolean;
  done?: boolean;
  autosave?: boolean;
};

export default class Document extends ArchivableModel implements Searchable {
  static modelName = "Document";

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

  @observable.shallow
  data: ProsemirrorData;

  /**
   * The original data source of the document, if imported.
   */
  sourceMetadata?: {
    /**
     * The type of importer that was used, if any. This can also be empty if an individual file was
     * imported through drag-and-drop, for example.
     */
    importType?: FileOperationFormat;
    /** The date this document was imported. */
    importedAt?: string;
    /** The name of the user the created the original source document. */
    createdByName?: string;
    /** The name of the file this document was imported from. */
    fileName?: string;
  };

  @computed
  get searchContent(): string {
    return this.title;
  }

  /**
   * The name of the original data source, if imported.
   */
  get sourceName() {
    if (!this.sourceMetadata?.importType) {
      return undefined;
    }

    switch (this.sourceMetadata.importType) {
      case FileOperationFormat.MarkdownZip:
        return "Markdown";
      case FileOperationFormat.JSON:
        return "JSON";
      case FileOperationFormat.Notion:
        return "Notion";
      default:
        return capitalize(this.sourceMetadata.importType);
    }
  }

  /**
   * The id of the collection that this document belongs to, if any.
   */
  @Field
  @observable
  collectionId?: string | null;

  /**
   * The collection that this document belongs to.
   */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection?: Collection;

  /**
   * The title of the document.
   */
  @Field
  @observable
  title: string;

  /**
   * An icon (or) emoji to use as the document icon.
   */
  @Field
  @observable
  icon?: string | null;

  /**
   * The color to use for the document icon.
   */
  @Field
  @observable
  color?: string | null;

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

  /**
   * Parent document that this is a child of, if any.
   */
  @Relation(() => Document, { onArchive: "cascade" })
  parentDocument?: Document;

  @observable
  collaboratorIds: string[];

  @Relation(() => User)
  createdBy: User | undefined;

  @Relation(() => User)
  @observable
  updatedBy: User | undefined;

  @observable
  publishedAt: string | undefined;

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
   * Whether this document is contained in a collection that has been deleted.
   */
  @observable
  isCollectionDeleted: boolean;

  /**
   * Returns the notifications associated with this document.
   */
  @computed
  get notifications(): Notification[] {
    return this.store.rootStore.notifications.filter(
      (notification: Notification) => notification.documentId === this.id
    );
  }

  /**
   * Returns the unread notifications associated with this document.
   */
  @computed
  get unreadNotifications(): Notification[] {
    return this.notifications.filter((notification) => !notification.viewedAt);
  }

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
    const prefix =
      this.template && !this.isDeleted ? settingsPath("templates") : "/doc";

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
    return !!this.store.rootStore.subscriptions.getByDocumentId(this.id);
  }

  /**
   * Returns whether the document is currently publicly shared, taking into account
   * the document's and team's sharing settings.
   *
   * @returns True if the document is publicly shared, false otherwise.
   */
  get isPubliclyShared(): boolean {
    const { shares, auth } = this.store.rootStore;
    const share = shares.getByDocumentId(this.id);
    const sharedParent = shares.getByDocumentParents(this.id);

    return !!(
      auth.team?.sharing !== false &&
      this.collection?.sharing !== false &&
      (share?.published || (sharedParent?.published && !this.isDraft))
    );
  }

  /**
   * Returns the documents that link to this document.
   *
   * @returns documents that link to this document
   */
  @computed
  get backlinks(): Document[] {
    return this.store.getBacklinkedDocuments(this.id);
  }

  /**
   * Returns users that have been individually given access to the document.
   *
   * @returns users that have been individually given access to the document
   */
  @computed
  get members(): User[] {
    return this.store.rootStore.userMemberships.orderedData
      .filter((m) => m.documentId === this.id)
      .map((m) => m.user)
      .filter(Boolean);
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

  /**
   * Returns the path to the document, using the collection structure if available.
   * otherwise if we're viewing a shared document we can iterate up the parentDocument tree.
   *
   * @returns path to the document
   */
  @computed
  get pathTo() {
    if (this.collection?.documents) {
      return this.collection.pathToDocument(this.id);
    }

    // find root parent document we have access to
    const path: Document[] = [this];

    while (path[0]?.parentDocument) {
      path.unshift(path[0].parentDocument);
    }

    return path.map((item) => item.asNavigationNode);
  }

  @computed
  get isWorkspaceTemplate() {
    return this.template && !this.collectionId;
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

  unpublish = (
    options: { detach?: boolean } = {
      detach: false,
    }
  ) => this.store.unpublish(this, options);

  @action
  enableEmbeds = () => {
    this.embedsDisabled = false;
  };

  @action
  disableEmbeds = () => {
    this.embedsDisabled = true;
  };

  @action
  pin = async (collectionId?: string | null) => {
    const pin = new Pin({}, this.store.rootStore.pins);

    await pin.save({
      documentId: this.id,
      ...(collectionId ? { collectionId } : {}),
    });

    return pin;
  };

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
  star = (index?: string) => this.store.star(this, index);

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
  unsubscribe = () => this.store.unsubscribe(this);

  @action
  view = () => {
    // we don't record views for documents in the trash
    if (this.isDeleted) {
      return;
    }

    // Mark associated unread notifications as read when the document is viewed
    this.store.rootStore.notifications
      .filter(
        (notification: Notification) =>
          !notification.viewedAt &&
          notification.documentId === this.id &&
          [
            NotificationEventType.AddUserToDocument,
            NotificationEventType.UpdateDocument,
            NotificationEventType.PublishDocument,
          ].includes(notification.event)
      )
      .forEach((notification) => notification.markAsRead());

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
  templatize = ({
    collectionId,
    publish,
  }: {
    collectionId: string | null;
    publish: boolean;
  }) => this.store.templatize({ id: this.id, collectionId, publish });

  @action
  save = async (
    fields?: Properties<typeof this>,
    options?: SaveOptions
  ): Promise<Document> => {
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

  move = (options: {
    collectionId?: string | null;
    parentDocumentId?: string;
  }) => this.store.move({ documentId: this.id, ...options });

  duplicate = (options?: {
    title?: string;
    publish?: boolean;
    recursive?: boolean;
    collectionId?: string | null;
    parentDocumentId?: string;
  }) => this.store.duplicate(this, options);

  /**
   * Returns the first blocks of the document, useful for displaying a preview.
   *
   * @param blocks The number of blocks to return, defaults to 4.
   * @returns A new ProseMirror document.
   */
  getSummary = (blocks = 4) => ({
    ...this.data,
    content: this.data.content?.slice(0, blocks),
  });

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
  get childDocuments() {
    return this.store.orderedData.filter(
      (doc) =>
        doc.parentDocumentId === this.id && this.isActive === doc.isActive
    );
  }

  @computed
  get asNavigationNode(): NavigationNode {
    return {
      type: NavigationNodeType.Document,
      id: this.id,
      title: this.title,
      color: this.color ?? undefined,
      icon: this.icon ?? undefined,
      children: this.childDocuments.map((doc) => doc.asNavigationNode),
      url: this.url,
      isDraft: this.isDraft,
    };
  }

  /**
   * Returns the markdown representation of the document derived from the ProseMirror data.
   *
   * @returns The markdown representation of the document as a string.
   */
  toMarkdown = () => {
    const extensionManager = new ExtensionManager(withComments(richExtensions));
    const serializer = extensionManager.serializer();
    const schema = new Schema({
      nodes: extensionManager.nodes,
      marks: extensionManager.marks,
    });
    const markdown = serializer.serialize(Node.fromJSON(schema, this.data), {
      softBreak: true,
    });
    return markdown;
  };

  /**
   * Returns the plain text representation of the document derived from the ProseMirror data.
   *
   * @returns The plain text representation of the document as a string.
   */
  toPlainText = () => {
    const extensionManager = new ExtensionManager(withComments(richExtensions));
    const schema = new Schema({
      nodes: extensionManager.nodes,
      marks: extensionManager.marks,
    });
    const text = ProsemirrorHelper.toPlainText(
      Node.fromJSON(schema, this.data),
      schema
    );
    return text;
  };

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
