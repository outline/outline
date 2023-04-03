import { NotificationEventType } from "@shared/types";
import DocumentMentionedEmail from "@server/emails/templates/DocumentMentionedEmail";
import DocumentPublishedOrUpdatedEmail from "@server/emails/templates/DocumentPublishedOrUpdatedEmail";
import { Notification } from "@server/models";
import { Event, NotificationEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class NotificationsProcessor extends BaseProcessor {
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
      case NotificationEventType.PublishDocument: {
        await new DocumentPublishedOrUpdatedEmail(
          {
            to: notification.user.email,
            userId: notification.user.id,
            eventType: NotificationEventType.PublishDocument,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
          },
          { notificationId }
        ).schedule();
        return;
      }

      case NotificationEventType.Mentioned: {
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

      default:
    }
  }
}
