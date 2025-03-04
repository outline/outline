import invariant from "invariant";
import { Op } from "sequelize";
import { MentionType, NotificationEventType } from "@shared/types";
import { Comment, Document, Notification, User } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { CommentEvent, CommentUpdateEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class CommentUpdatedNotificationsTask extends BaseTask<CommentEvent> {
  public async perform(event: CommentUpdateEvent) {
    const isResolving =
      event.changes?.previous?.resolvedAt === null &&
      event.changes?.attributes?.resolvedAt !== null;

    return isResolving
      ? await this.handleResolvedComment(event)
      : await this.handleMentionedComment(event);
  }

  private async handleMentionedComment(event: CommentUpdateEvent) {
    const newMentionIds = event.data?.newMentionIds;
    if (!newMentionIds) {
      return;
    }

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

    const mentions = ProsemirrorHelper.parseMentions(
      ProsemirrorHelper.toProsemirror(comment.data),
      { type: MentionType.User }
    ).filter((mention) => newMentionIds.includes(mention.id));
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
          documentId: document.id,
          commentId: comment.id,
        });
        userIdsMentioned.push(mention.modelId);
      }
    }
  }

  private async handleResolvedComment(event: CommentUpdateEvent) {
    invariant(
      !event.data?.newMentionIds,
      "newMentionIds should not be present in resolved comment"
    );

    const [document, commentsAndReplies] = await Promise.all([
      Document.scope("withCollection").findOne({
        where: { id: event.documentId },
      }),
      Comment.findAll({
        where: {
          [Op.or]: [{ id: event.modelId }, { parentCommentId: event.modelId }],
        },
      }),
    ]);

    if (!document || !commentsAndReplies) {
      return;
    }

    const userIdsNotified: string[] = [];

    // Don't notify resolver
    userIdsNotified.push(event.actorId);

    for (const item of commentsAndReplies) {
      // Mentions:
      const proseCommentData = ProsemirrorHelper.toProsemirror(item.data);
      const mentions = ProsemirrorHelper.parseMentions(proseCommentData, {
        type: MentionType.User,
      });
      const userIds = mentions.map((mention) => mention.modelId);

      // Comment author:
      userIds.push(item.createdById);

      for (const userId of userIds) {
        if (userIdsNotified.includes(userId)) {
          continue;
        }

        const user = await User.findByPk(userId);

        if (
          user &&
          user.subscribedToEventType(NotificationEventType.ResolveComment) &&
          (await canUserAccessDocument(user, document.id))
        ) {
          await Notification.create({
            event: NotificationEventType.ResolveComment,
            userId: user.id,
            actorId: event.actorId,
            teamId: document.teamId,
            documentId: document.id,
            commentId: event.modelId,
          });

          userIdsNotified.push(userId);
        }
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
