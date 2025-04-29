import {
  CollectionEvent,
  RevisionEvent,
  Event,
  DocumentEvent,
  CommentEvent,
  CollectionUserEvent,
  DocumentUserEvent,
  DocumentGroupEvent,
} from "@server/types";
import CollectionAddUserNotificationsTask from "../tasks/CollectionAddUserNotificationsTask";
import CollectionCreatedNotificationsTask from "../tasks/CollectionCreatedNotificationsTask";
import CommentCreatedNotificationsTask from "../tasks/CommentCreatedNotificationsTask";
import CommentUpdatedNotificationsTask from "../tasks/CommentUpdatedNotificationsTask";
import DocumentAddGroupNotificationsTask from "../tasks/DocumentAddGroupNotificationsTask";
import DocumentAddUserNotificationsTask from "../tasks/DocumentAddUserNotificationsTask";
import DocumentPublishedNotificationsTask from "../tasks/DocumentPublishedNotificationsTask";
import RevisionCreatedNotificationsTask from "../tasks/RevisionCreatedNotificationsTask";
import BaseProcessor from "./BaseProcessor";

export default class NotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "documents.add_user",
    "documents.add_group",
    "revisions.create",
    "collections.create",
    "collections.add_user",
    "comments.create",
    "comments.update",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.publish":
        return this.documentPublished(event);
      case "documents.add_user":
        return this.documentAddUser(event);
      case "documents.add_group":
        return this.documentAddGroup(event);
      case "revisions.create":
        return this.revisionCreated(event);
      case "collections.create":
        return this.collectionCreated(event);
      case "collections.add_user":
        return this.collectionAddUser(event);
      case "comments.create":
        return this.commentCreated(event);
      case "comments.update":
        return this.commentUpdated(event);
      default:
    }
  }

  async documentPublished(event: DocumentEvent) {
    // never send notifications when batch importing
    if (
      "data" in event &&
      "source" in event.data &&
      event.data.source === "import"
    ) {
      return;
    }

    await new DocumentPublishedNotificationsTask().schedule(event);
  }

  async documentAddUser(event: DocumentUserEvent) {
    if (!event.data.isNew || event.userId === event.actorId) {
      return;
    }
    await new DocumentAddUserNotificationsTask().schedule(event);
  }

  async documentAddGroup(event: DocumentGroupEvent) {
    if (!event.data.isNew) {
      return;
    }
    await new DocumentAddGroupNotificationsTask().schedule(event);
  }

  async revisionCreated(event: RevisionEvent) {
    await new RevisionCreatedNotificationsTask().schedule(event);
  }

  async collectionCreated(event: CollectionEvent) {
    // never send notifications when batch importing
    if (
      "data" in event &&
      "source" in event.data &&
      event.data.source === "import"
    ) {
      return;
    }

    await new CollectionCreatedNotificationsTask().schedule(event);
  }

  async collectionAddUser(event: CollectionUserEvent) {
    if (!event.data.isNew || event.userId === event.actorId) {
      return;
    }

    await new CollectionAddUserNotificationsTask().schedule(event);
  }

  async commentCreated(event: CommentEvent) {
    await new CommentCreatedNotificationsTask().schedule(event);
  }

  async commentUpdated(event: CommentEvent) {
    await new CommentUpdatedNotificationsTask().schedule(event);
  }
}
