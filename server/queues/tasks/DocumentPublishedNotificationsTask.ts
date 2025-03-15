import { MentionType, NotificationEventType } from "@shared/types";
import { createSubscriptionsForDocument } from "@server/commands/subscriptionCreator";
import { Document, Notification, User } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { DocumentEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class DocumentPublishedNotificationsTask extends BaseTask<DocumentEvent> {
  public async perform(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId, {
      includeState: true,
    });
    if (!document) {
      return;
    }

    await createSubscriptionsForDocument(document, event);

    // Send notifications to mentioned users first
    const mentions = DocumentHelper.parseMentions(document, {
      type: MentionType.User,
    });
    const userIdsMentioned: string[] = [];

    for (const mention of mentions) {
      if (userIdsMentioned.includes(mention.modelId)) {
        continue;
      }

      const recipient = await User.findByPk(mention.modelId);

      if (
        recipient &&
        recipient.id !== mention.actorId &&
        recipient.subscribedToEventType(
          NotificationEventType.MentionedInDocument
        ) &&
        (await canUserAccessDocument(recipient, document.id))
      ) {
        await Notification.create({
          event: NotificationEventType.MentionedInDocument,
          userId: recipient.id,
          actorId: mention.actorId,
          teamId: document.teamId,
          documentId: document.id,
        });
        userIdsMentioned.push(recipient.id);
      }
    }

    const recipients = (
      await NotificationHelper.getDocumentNotificationRecipients({
        document,
        notificationType: NotificationEventType.PublishDocument,
        onlySubscribers: false,
        actorId: document.lastModifiedById,
      })
    ).filter((recipient) => !userIdsMentioned.includes(recipient.id));

    for (const recipient of recipients) {
      await Notification.create({
        event: NotificationEventType.PublishDocument,
        userId: recipient.id,
        actorId: document.updatedBy.id,
        teamId: document.teamId,
        documentId: document.id,
      });
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
