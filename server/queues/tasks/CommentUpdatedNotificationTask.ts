import { NotificationEventType } from "@shared/types";
import CommentMentionedEmail from "@server/emails/templates/CommentMentionedEmail";
import { Comment, Document, Notification, Team, User } from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import ProsemirrorHelper from "@server/models/helpers/ProsemirrorHelper";
import { CommentEvent, CommentUpdateEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class CommentUpdatedNotificationTask extends BaseTask<
  CommentEvent
> {
  public async perform(event: CommentUpdateEvent) {
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

    const mentions = ProsemirrorHelper.parseMentions(
      ProsemirrorHelper.toProsemirror(comment.data)
    ).filter((mention) => event.data.newMentionIds.includes(mention.id));
    if (mentions.length === 0) {
      return;
    }

    let content = ProsemirrorHelper.toHTML(
      ProsemirrorHelper.toProsemirror(comment.data),
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

    for (const mention of mentions) {
      const [recipient, actor] = await Promise.all([
        User.findByPk(mention.modelId),
        User.findByPk(mention.actorId),
      ]);
      if (
        recipient &&
        actor &&
        recipient.id !== actor.id &&
        recipient.subscribedToEventType(NotificationEventType.Mentioned)
      ) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.id,
          actorId: actor.id,
          teamId: team.id,
          documentId: document.id,
        });

        await new CommentMentionedEmail(
          {
            to: recipient.email,
            userId: recipient.id,
            documentId: document.id,
            teamUrl: team.url,
            actorName: comment.createdBy.name,
            commentId: comment.id,
            content,
            collectionName: document.collection?.name,
          },
          { notificationId: notification.id }
        ).schedule();
      }
    }
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
