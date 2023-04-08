import { NotificationEventType } from "@shared/types";
import CollectionCreatedEmail from "@server/emails/templates/CollectionCreatedEmail";
import CommentCreatedEmail from "@server/emails/templates/CommentCreatedEmail";
import CommentMentionedEmail from "@server/emails/templates/CommentMentionedEmail";
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

    switch (notification.event) {
      case NotificationEventType.UpdateDocument:
      case NotificationEventType.PublishDocument: {
        await new DocumentPublishedOrUpdatedEmail(notification).schedule();
        return;
      }

      case NotificationEventType.MentionedInDocument: {
        await new DocumentMentionedEmail(notification).schedule();
        return;
      }

      case NotificationEventType.MentionedInComment: {
        await new CommentMentionedEmail(notification).schedule();
        return;
      }

      case NotificationEventType.CreateCollection: {
        await new CollectionCreatedEmail(notification).schedule();
        return;
      }

      case NotificationEventType.CreateComment: {
        await new CommentCreatedEmail(notification).schedule();
      }
    }
  }
}
