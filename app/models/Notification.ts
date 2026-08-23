import type { TFunction } from "i18next";
import { action, computed, observable } from "mobx";
import type { NotificationData } from "@shared/types";
import { NotificationEventType } from "@shared/types";
import {
  notebookPath,
  commentPath,
  notePath,
  settingsPath,
} from "~/utils/routeHelpers";
import Notebook from "./Notebook";
import Comment from "./Comment";
import Note from "./Note";
import User from "./User";
import Model from "./base/Model";
import Field, { WireAlias } from "./decorators/Field";
import Relation from "./decorators/Relation";
export type NotificationFilter =
  | "all"
  | "mentions"
  | "comments"
  | "reactions"
  | "notes"
  | "collections"
  | "system";
class Notification extends Model {
  static modelName = "Notification";
  static filterCategories: Record<NotificationFilter, NotificationEventType[]> =
    {
      all: [],
      mentions: [
        NotificationEventType.MentionedInNote,
        NotificationEventType.MentionedInComment,
        NotificationEventType.GroupMentionedInNote,
        NotificationEventType.GroupMentionedInComment,
      ],
      comments: [
        NotificationEventType.CreateComment,
        NotificationEventType.ResolveComment,
        NotificationEventType.ReactionsCreate,
      ],
      reactions: [NotificationEventType.ReactionsCreate],
      notes: [
        NotificationEventType.PublishNote,
        NotificationEventType.UpdateNote,
        NotificationEventType.CreateRevision,
        NotificationEventType.AddUserToNote,
        NotificationEventType.RequestNoteAccess,
      ],
      collections: [
        NotificationEventType.CreateNotebook,
        NotificationEventType.AddUserToNotebook,
      ],
      system: [
        NotificationEventType.InviteAccepted,
        NotificationEventType.Onboarding,
        NotificationEventType.Features,
        NotificationEventType.ExportCompleted,
      ],
    };
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
   * Request ID on notifications for access requests.
   */
  @Field
  @observable
  accessRequestId?: string;
  /**
   * Status of the associated access request.
   */
  @Field
  @observable
  accessRequestStatus?: string;
  /**
   * The user that triggered the notification.
   */
  @Relation(() => User)
  actor?: User;
  /**
   * The note ID that the notification is associated with.
   */
  noteId?: string;
  /**
   * The note that the notification is associated with.
   */
  @Relation(() => Note, { onDelete: "cascade" })
  note?: Note;
  /**
   * The collection ID that the notification is associated with.
   */
  @WireAlias("collectionId")
  notebookId?: string;
  /**
   * The collection that the notification is associated with.
   */
  @Relation(() => Notebook, { onDelete: "cascade" })
  notebook?: Notebook;
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
   * Additional data associated with the notification.
   */
  data: NotificationData;
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
   * Archive the notification
   *
   * @returns A promise that resolves when the notification has been archived.
   */
  @action
  archive() {
    if (this.archivedAt) {
      return;
    }
    this.archivedAt = new Date();
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
      case NotificationEventType.PublishNote:
        return t("published");
      case NotificationEventType.UpdateNote:
      case NotificationEventType.CreateRevision:
        return t("edited");
      case NotificationEventType.CreateNotebook:
        return t("created the notebook");
      case NotificationEventType.MentionedInNote:
      case NotificationEventType.MentionedInComment:
        return t("mentioned you in");
      case NotificationEventType.GroupMentionedInComment:
      case NotificationEventType.GroupMentionedInNote:
        return t("mentioned your group in");
      case NotificationEventType.CreateComment:
        return t("left a comment on");
      case NotificationEventType.ResolveComment:
        return t("resolved a comment on");
      case NotificationEventType.ReactionsCreate:
        return t("reacted {{ emoji }} to your comment on", {
          emoji: this.data.emoji,
        });
      case NotificationEventType.AddUserToNote:
        return t("shared");
      case NotificationEventType.AddUserToNotebook:
        return t("invited you to");
      case NotificationEventType.RequestNoteAccess:
        if (this.accessRequestStatus === "approved") {
          return t("was granted access to");
        }
        if (this.accessRequestStatus === "dismissed") {
          return t("requested access to");
        }
        return t("is requesting access to");
      default:
        return this.event;
    }
  }
  /**
   * Returns the subject of the notification. This is the title of the associated
   * note.
   *
   * @returns The subject
   */
  get subject() {
    if (this.noteId) {
      return this.note?.title ?? "a note";
    }
    if (this.notebookId) {
      return this.notebook?.name ?? "a notebook";
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
      case NotificationEventType.PublishNote:
      case NotificationEventType.UpdateNote:
      case NotificationEventType.CreateRevision: {
        return this.note ? notePath(this.note) : "";
      }
      case NotificationEventType.AddUserToNotebook:
      case NotificationEventType.CreateNotebook: {
        const notebook = this.notebookId
          ? this.store.rootStore.notebooks.get(this.notebookId)
          : undefined;
        return notebook ? notebookPath(notebook) : "";
      }
      case NotificationEventType.RequestNoteAccess:
      case NotificationEventType.AddUserToNote:
      case NotificationEventType.GroupMentionedInNote:
      case NotificationEventType.MentionedInNote: {
        return this.note?.path;
      }
      case NotificationEventType.GroupMentionedInComment:
      case NotificationEventType.MentionedInComment:
      case NotificationEventType.ResolveComment:
      case NotificationEventType.CreateComment:
      case NotificationEventType.ReactionsCreate: {
        return this.note && this.comment
          ? commentPath(this.note, this.comment)
          : this.note?.path;
      }
      case NotificationEventType.InviteAccepted: {
        return settingsPath("users");
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
