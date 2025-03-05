import {
  MentionType,
  NotificationEventType,
  SubscriptionType,
} from "@shared/types";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { createContext } from "@server/context";
import { Comment, Document, Notification, User } from "@server/models";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import { CommentEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import BaseTask, { TaskPriority } from "./BaseTask";

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

    const recipients = (
      await NotificationHelper.getCommentNotificationRecipients(
        document,
        comment,
        comment.createdById
      )
    ).filter((recipient) => !userIdsMentioned.includes(recipient.id));

    for (const recipient of recipients) {
      await Notification.create({
        event: NotificationEventType.CreateComment,
        userId: recipient.id,
        actorId: comment.createdById,
        teamId: document.teamId,
        commentId: comment.id,
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
