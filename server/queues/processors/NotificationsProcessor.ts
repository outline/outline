import { Minute } from "@shared/utils/time";
import {
  CollectionEvent,
  RevisionEvent,
  Event,
  DocumentEvent,
  CommentEvent,
} from "@server/types";
import CollectionCreatedNotificationTask from "../tasks/CollectionCreatedNotificationTask";
import CommentCreatedNotificationTask from "../tasks/CommentCreatedNotificationTask";
import CommentUpdatedNotificationTask from "../tasks/CommentUpdatedNotificationTask";
import DocumentPublishedNotificationTask from "../tasks/DocumentPublishedNotificationTask";
import RevisionCreatedNotificationTask from "../tasks/RevisionCreatedNotificationTask";
import BaseProcessor from "./BaseProcessor";

export default class NotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "collections.create",
    "comments.create",
    "comments.update",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.publish":
        return this.documentPublished(event);
      case "revisions.create":
        return this.revisionCreated(event);
      case "collections.create":
        return this.collectionCreated(event);
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

    await DocumentPublishedNotificationTask.schedule(event);
  }

  async revisionCreated(event: RevisionEvent) {
    await RevisionCreatedNotificationTask.schedule(event);
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

    await CollectionCreatedNotificationTask.schedule(event);
  }

  async commentCreated(event: CommentEvent) {
    await CommentCreatedNotificationTask.schedule(event, {
      delay: Minute,
    });
  }

  async commentUpdated(event: CommentEvent) {
    await CommentUpdatedNotificationTask.schedule(event, {
      delay: Minute,
    });
  }
}
