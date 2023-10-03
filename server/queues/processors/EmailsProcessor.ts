import { NotificationEventType } from "@shared/types";
import CollectionCreatedEmail from "@server/emails/templates/CollectionCreatedEmail";
import CommentCreatedEmail from "@server/emails/templates/CommentCreatedEmail";
import CommentMentionedEmail from "@server/emails/templates/CommentMentionedEmail";
import DocumentMentionedEmail from "@server/emails/templates/DocumentMentionedEmail";
import DocumentPublishedOrUpdatedEmail from "@server/emails/templates/DocumentPublishedOrUpdatedEmail";
import { Notification } from "@server/models";
import { Event, NotificationEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class EmailsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["notifications.create"];

  async perform(event: NotificationEvent) {
    const notification = await Notification.scope([
      "withTeam",
      "withUser",
      "withActor",
    ]).findByPk(event.modelId);
    if (!notification) {
      return;
    }

    const notificationId = notification.id;

    switch (notification.event) {
      case NotificationEventType.UpdateDocument:
      case NotificationEventType.PublishDocument: {
        await new DocumentPublishedOrUpdatedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            eventType: notification.event,
            revisionId: notification.revisionId,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
          },
          { notificationId }
        ).schedule();
        return;
      }

      case NotificationEventType.MentionedInDocument: {
        await new DocumentMentionedEmail(
          {
            to: notification.user.email,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
          },
          { notificationId }
        ).schedule();
        return;
      }

      case NotificationEventType.MentionedInComment: {
        await new CommentMentionedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
            commentId: notification.commentId,
          },
          { notificationId: notification.id }
        ).schedule();
        return;
      }

      case NotificationEventType.CreateCollection: {
        await new CollectionCreatedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            collectionId: notification.collectionId,
            teamUrl: notification.team.url,
          },
          { notificationId: notification.id }
        ).schedule();
        return;
      }

      case NotificationEventType.CreateComment: {
        await new CommentCreatedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
            commentId: notification.commentId,
          },
          { notificationId: notification.id }
        ).schedule();
      }
    }
  }
}
