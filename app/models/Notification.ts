import { TFunction } from "i18next";
import { action, computed, observable } from "mobx";
import { NotificationEventType } from "@shared/types";
import {
  collectionPath,
  commentPath,
  documentPath,
  settingsPath,
} from "~/utils/routeHelpers";
import Collection from "./Collection";
import Comment from "./Comment";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class Notification extends Model {
  static modelName = "Notification";

  /**
   * The date the notification was marked as read.
   */
  @Field
  @observable
  viewedAt: Date | null;

  /**
   * The date the notification was archived.
   */
  @Field
  @observable
  archivedAt: Date | null;

  /**
   * The user that triggered the notification.
   */
  @Relation(() => User)
  actor?: User;

  /**
   * The document ID that the notification is associated with.
   */
  documentId?: string;

  /**
   * The document that the notification is associated with.
   */
  @Relation(() => Document, { onDelete: "cascade" })
  document?: Document;

  /**
   * The collection ID that the notification is associated with.
   */
  collectionId?: string;

  /**
   * The collection that the notification is associated with.
   */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection?: Collection;

  commentId?: string;

  /**
   * The comment that the notification is associated with.
   */
  @Relation(() => Comment, { onDelete: "cascade" })
  comment?: Comment;

  /**
   * The type of notification.
   */
  event: NotificationEventType;

  /**
   * Mark the notification as read or unread
   *
   * @returns A promise that resolves when the notification has been saved.
   */
  @action
  toggleRead() {
    this.viewedAt = this.viewedAt ? null : new Date();
    return this.save();
  }

  /**
   * Mark the notification as read
   *
   * @returns A promise that resolves when the notification has been saved.
   */
  @action
  markAsRead() {
    if (this.viewedAt) {
      return;
    }

    this.viewedAt = new Date();
    return this.save();
  }

  /**
   * Returns translated text that describes the notification
   *
   * @param t - The translation function
   * @returns The event text
   */
  eventText(t: TFunction): string {
    switch (this.event) {
      case NotificationEventType.PublishDocument:
        return t("published");
      case NotificationEventType.UpdateDocument:
      case NotificationEventType.CreateRevision:
        return t("edited");
      case NotificationEventType.CreateCollection:
        return t("created the collection");
      case NotificationEventType.MentionedInDocument:
      case NotificationEventType.MentionedInComment:
        return t("mentioned you in");
      case NotificationEventType.CreateComment:
        return t("left a comment on");
      case NotificationEventType.ResolveComment:
        return t("resolved a comment on");
      case NotificationEventType.AddUserToDocument:
        return t("shared");
      case NotificationEventType.AddUserToCollection:
        return t("invited you to");
      default:
        return this.event;
    }
  }

  /**
   * Returns the subject of the notification. This is the title of the associated
   * document.
   *
   * @returns The subject
   */
  get subject() {
    if (this.documentId) {
      return this.document?.title ?? "a document";
    }
    if (this.collectionId) {
      return this.collection?.name ?? "a collection";
    }
    return "Unknown";
  }

  /**
   * Returns the path to the model associated with the notification that can be
   * used with the router.
   *
   * @returns The router path.
   */
  @computed
  get path() {
    switch (this.event) {
      case NotificationEventType.PublishDocument:
      case NotificationEventType.UpdateDocument:
      case NotificationEventType.CreateRevision: {
        return this.document ? documentPath(this.document) : "";
      }
      case NotificationEventType.AddUserToCollection:
      case NotificationEventType.CreateCollection: {
        const collection = this.collectionId
          ? this.store.rootStore.collections.get(this.collectionId)
          : undefined;
        return collection ? collectionPath(collection.path) : "";
      }
      case NotificationEventType.AddUserToDocument:
      case NotificationEventType.MentionedInDocument: {
        return this.document?.path;
      }
      case NotificationEventType.MentionedInComment:
      case NotificationEventType.ResolveComment:
      case NotificationEventType.CreateComment: {
        return this.document && this.comment
          ? commentPath(this.document, this.comment)
          : this.document?.path;
      }
      case NotificationEventType.InviteAccepted: {
        return settingsPath("members");
      }
      case NotificationEventType.Onboarding:
      case NotificationEventType.Features: {
        return "";
      }
      case NotificationEventType.ExportCompleted: {
        return settingsPath("export");
      }
      default:
        this.event satisfies never;
        return;
    }
  }
}

export default Notification;
