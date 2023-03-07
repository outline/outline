import { Node } from "prosemirror-model";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { sequelize } from "@server/database/sequelize";
import { schema } from "@server/editor";
import CommentCreatedEmail from "@server/emails/templates/CommentCreatedEmail";
import { Comment, Document, Notification, Team, User } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import ProsemirrorHelper from "@server/models/helpers/ProsemirrorHelper";
import { CommentEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class CommentCreatedNotificationTask extends BaseTask<
  CommentEvent
> {
  public async perform(event: CommentEvent) {
    const [document, comment, team] = await Promise.all([
      Document.scope("withCollection").findOne({
        where: {
          id: event.documentId,
        },
      }),
      Comment.findByPk(event.modelId),
      Team.findByPk(event.teamId),
    ]);
    if (!document || !comment || !team) {
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

    let content = ProsemirrorHelper.toHTML(
      Node.fromJSON(schema, comment.data),
      {
        centered: false,
      }
    );
    if (!content) {
      return;
    }

    content = await DocumentHelper.attachmentsToSignedUrls(
      content,
      event.teamId,
      86400 * 4
    );

    const mentions = ProsemirrorHelper.parseMentions(
      ProsemirrorHelper.toProsemirror(comment.data)
    );
    const userIdsSentNotifications: string[] = [];

    for (const mention of mentions) {
      const [recipient, actor] = await Promise.all([
        User.findByPk(mention.modelId),
        User.findByPk(mention.actorId),
      ]);
      if (recipient && actor && recipient.id !== actor.id) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.id,
          actorId: actor.id,
          teamId: team.id,
          documentId: document.id,
        });
        userIdsSentNotifications.push(recipient.id);
        await CommentCreatedEmail.schedule(
          {
            to: recipient.email,
            documentId: document.id,
            teamUrl: team.url,
            isReply: !!comment.parentCommentId,
            actorName: comment.createdBy.name,
            commentId: comment.id,
            content,
            collectionName: document.collection?.name,
          },
          { notificationId: notification.id }
        );
      }
    }

    const recipients = (
      await NotificationHelper.getCommentNotificationRecipients(
        document,
        comment,
        comment.createdById
      )
    ).filter(
      (recipient) => !userIdsSentNotifications.includes(recipient.userId)
    );
    if (!recipients.length) {
      return;
    }

    for (const recipient of recipients) {
      const notification = await Notification.create({
        event: event.name,
        userId: recipient.user.id,
        actorId: comment.createdById,
        teamId: team.id,
        documentId: document.id,
      });
      await CommentCreatedEmail.schedule(
        {
          to: recipient.user.email,
          documentId: document.id,
          teamUrl: team.url,
          isReply: !!comment.parentCommentId,
          actorName: comment.createdBy.name,
          commentId: comment.id,
          content,
          collectionName: document.collection?.name,
          unsubscribeUrl: recipient.unsubscribeUrl,
        },
        { notificationId: notification.id }
      );
    }
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
