import invariant from "invariant";
import { Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import { Comment, Document, Notification, User } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { CommentEvent, CommentUpdateEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/policies";
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
      ProsemirrorHelper.toProsemirror(comment.data)
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

    const send = async (userId: string) => {
      await Notification.create({
        event: NotificationEventType.ResolveComment,
        userId,
        actorId: event.actorId,
        teamId: document.teamId,
        documentId: document.id,
        commentId: event.modelId,
      });
    };

    const userIdsNotified: string[] = [];

    // Don't notify resolver
    userIdsNotified.push(event.actorId);

    // Notify: (1) commenter (2) all repliers (3) all mentioned in the thread
    for (const item of commentsAndReplies) {
      if (!userIdsNotified.includes(item.createdById)) {
        // -- author (comment or reply)
        const user = await User.findByPk(item.createdById);

        if (
          user &&
          user.id !== event.actorId &&
          user.subscribedToEventType(NotificationEventType.ResolveComment) &&
          (await canUserAccessDocument(user, document.id))
        ) {
          await send(user.id);
          userIdsNotified.push(user.id);
        }
      }

      // -- mentions
      const proseCommentData = ProsemirrorHelper.toProsemirror(item.data);
      const mentions = ProsemirrorHelper.parseMentions(proseCommentData);

      for (const mention of mentions) {
        if (userIdsNotified.includes(mention.modelId)) {
          continue;
        }

        const user = await User.findByPk(mention.modelId);

        if (
          mention.actorId &&
          user &&
          user.id !== mention.actorId &&
          user.subscribedToEventType(NotificationEventType.ResolveComment) &&
          (await canUserAccessDocument(user, document.id))
        ) {
          await send(user.id);
          userIdsNotified.push(mention.modelId);
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
