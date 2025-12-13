import {
  MentionType,
  NotificationEventType,
  SubscriptionType,
} from "@shared/types";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { createContext } from "@server/context";
import {
  Comment,
  Document,
  Group,
  GroupUser,
  Notification,
  User,
} from "@server/models";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import { CommentEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";

export default class CommentCreatedNotificationsTask extends BaseTask<CommentEvent> {
  public async perform(event: CommentEvent) {
    const [document, comment] = await Promise.all([
      Document.scope("withCollection").findOne({
        where: {
          id: event.documentId,
        },
      }),
      Comment.findByPk(event.modelId),
    ]);
    if (!document || !comment) {
      return;
    }

    // Commenting on a doc automatically creates a subscription to the doc
    // if they haven't previously had one.
    await sequelize.transaction(async (transaction) => {
      await subscriptionCreator({
        ctx: createContext({
          user: comment.createdBy,
          authType: event.authType,
          ip: event.ip,
          transaction,
        }),
        documentId: document.id,
        event: SubscriptionType.Document,
        resubscribe: false,
      });
    });

    const mentions = ProsemirrorHelper.parseMentions(
      ProsemirrorHelper.toProsemirror(comment.data),
      { type: MentionType.User }
    );
    const userIdsMentioned: string[] = [];

    for (const mention of mentions) {
      if (userIdsMentioned.includes(mention.modelId)) {
        continue;
      }

      const recipient = await User.findByPk(mention.modelId);

      if (
        mention.actorId &&
        recipient &&
        recipient.id !== mention.actorId &&
        recipient.subscribedToEventType(
          NotificationEventType.MentionedInComment
        ) &&
        (await canUserAccessDocument(recipient, document.id))
      ) {
        await Notification.create({
          event: NotificationEventType.MentionedInComment,
          userId: recipient.id,
          actorId: mention.actorId,
          teamId: document.teamId,
          commentId: comment.id,
          documentId: document.id,
        });
        userIdsMentioned.push(recipient.id);
      }
    }

    // send notifications to users in mentioned groups
    const groupMentions = ProsemirrorHelper.parseMentions(
      ProsemirrorHelper.toProsemirror(comment.data),
      {
        type: MentionType.Group,
      }
    );

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
            NotificationEventType.GroupMentionedInComment
          ) &&
          (await canUserAccessDocument(recipient, document.id))
        ) {
          await Notification.create({
            event: NotificationEventType.GroupMentionedInComment,
            groupId: group.modelId,
            userId: recipient.id,
            actorId: group.actorId,
            teamId: document.teamId,
            documentId: document.id,
            commentId: comment.id,
          });

          mentionedUser.push(user.userId);
        }
      }

      mentionedGroup.push(group.modelId);
    }

    const recipients = (
      await NotificationHelper.getCommentNotificationRecipients(
        document,
        comment,
        comment.createdById
      )
    ).filter((recipient) => !userIdsMentioned.includes(recipient.id));

    await sequelize.transaction(async (transaction) => {
      for (const recipient of recipients) {
        await Notification.create(
          {
            event: NotificationEventType.CreateComment,
            userId: recipient.id,
            actorId: comment.createdById,
            teamId: document.teamId,
            commentId: comment.id,
            documentId: document.id,
          },
          { transaction }
        );
      }
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
