import { MentionType, NotificationEventType } from "@shared/types";
import { createSubscriptionsForDocument } from "@server/commands/subscriptionCreator";
import { Document, Group, Notification, User, GroupUser } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { DocumentEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";

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

    // send notifications to users in mentioned groups
    const groupMentions = DocumentHelper.parseMentions(document, {
      type: MentionType.Group,
    });
    const mentionedGroup: string[] = [];
    for (const group of groupMentions) {
      if (mentionedGroup.includes(group.modelId)) {
        continue;
      }

      // Check if the group has mentions disabled
      const groupModel = await Group.findByPk(group.modelId);
      if (groupModel?.disableMentions) {
        continue;
      }

      const usersFromMentionedGroup = await GroupUser.findAll({
        where: {
          groupId: group.modelId,
        },
        order: [["permission", "ASC"]],
      });

      const mentionedUser: string[] = [];
      for (const user of usersFromMentionedGroup) {
        if (mentionedUser.includes(user.userId)) {
          continue;
        }

        const recipient = await User.findByPk(user.userId);
        if (
          recipient &&
          recipient.id !== group.actorId &&
          recipient.subscribedToEventType(
            NotificationEventType.GroupMentionedInDocument
          ) &&
          (await canUserAccessDocument(recipient, document.id))
        ) {
          await Notification.create({
            event: NotificationEventType.GroupMentionedInDocument,
            groupId: group.modelId,
            userId: recipient.id,
            actorId: group.actorId,
            teamId: document.teamId,
            documentId: document.id,
          });

          mentionedUser.push(user.userId);
        }
      }

      mentionedGroup.push(group.modelId);
    }

    const recipients = (
      await NotificationHelper.getDocumentNotificationRecipients({
        document,
        notificationType: NotificationEventType.PublishDocument,
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
