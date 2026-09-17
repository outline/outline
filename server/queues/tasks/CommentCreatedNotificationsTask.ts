import {
  MentionType,
  NotificationEventType,
  SubscriptionType,
} from "@shared/types";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { createContext } from "@server/context";
import { Comment, Document, Group, Notification, User } from "@server/models";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import type { CommentEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";
import GroupMentionedInCommentNotificationsTask from "./GroupMentionedInCommentNotificationsTask";

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

    // Comments left by public visitors have no account behind them, so there
    // is no author to subscribe to the document or to attribute mentions to
    // — guest input can't contain mentions in the first place (rejected on
    // creation), so the subscription and mention handling below are both
    // skipped entirely for guest comments.
    const author = comment.createdBy;

    if (author) {
      // Commenting on a doc automatically creates a subscription to the doc
      // if they haven't previously had one.
      await sequelize.transaction(async (transaction) => {
        await subscriptionCreator({
          ctx: createContext({
            user: author,
            authType: event.authType,
            ip: event.ip,
            transaction,
          }),
          documentId: document.id,
          event: SubscriptionType.Document,
          resubscribe: false,
        });
      });
    }

    const mentions = author
      ? ProsemirrorHelper.parseMentions(
          ProsemirrorHelper.toProsemirror(comment.data),
          { type: MentionType.User }
        )
      : [];
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
    const groupMentions = author
      ? ProsemirrorHelper.parseMentions(
          ProsemirrorHelper.toProsemirror(comment.data),
          {
            type: MentionType.Group,
          }
        )
      : [];

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

      // Schedule a separate task to handle group member notifications
      await new GroupMentionedInCommentNotificationsTask().schedule({
        ...event,
        data: {
          groupId: group.modelId,
          actorId: group.actorId ?? event.actorId,
        },
      });

      mentionedGroup.push(group.modelId);
    }

    const recipients = (
      await NotificationHelper.getCommentNotificationRecipients(
        document,
        comment,
        author?.id ?? null
      )
    ).filter((recipient) => !userIdsMentioned.includes(recipient.id));

    await sequelize.transaction(async (transaction) => {
      for (const recipient of recipients) {
        await Notification.create(
          {
            event: NotificationEventType.CreateComment,
            userId: recipient.id,
            actorId: author?.id ?? null,
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
