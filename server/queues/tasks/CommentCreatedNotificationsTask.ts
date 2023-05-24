import { NotificationEventType } from "@shared/types";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { sequelize } from "@server/database/sequelize";
import { Comment, Document, Notification, User } from "@server/models";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import ProsemirrorHelper from "@server/models/helpers/ProsemirrorHelper";
import { CommentEvent } from "@server/types";
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
        user: comment.createdBy,
        documentId: document.id,
        event: "documents.update",
        resubscribe: false,
        transaction,
        ip: event.ip,
      });
    });

    const mentions = ProsemirrorHelper.parseMentions(
      ProsemirrorHelper.toProsemirror(comment.data)
    );
    const userIdsMentioned: string[] = [];

    for (const mention of mentions) {
      const recipient = await User.findByPk(mention.modelId);

      if (
        recipient &&
        recipient.id !== mention.actorId &&
        recipient.subscribedToEventType(
          NotificationEventType.MentionedInComment
        )
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
