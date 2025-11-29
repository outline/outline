import { NotificationEventType } from "@shared/types";
import { Comment, Document, Notification, User } from "@server/models";
import { CommentReactionEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";

export default class ReactionCreatedNotificationsTask extends BaseTask<CommentReactionEvent> {
  public async perform(event: CommentReactionEvent) {
    const { emoji } = event.data;

    // Only handle add_reaction events, not remove_reaction
    if (event.name !== "comments.add_reaction") {
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

    // Get the user who reacted (the actor)
    const actor = await User.findByPk(event.actorId);
    if (!actor) {
      return;
    }

    // Get the comment author (the recipient of the notification)
    const recipient = await User.findByPk(comment.createdById);
    if (!recipient) {
      return;
    }

    // Don't notify if the user reacted to their own comment
    if (actor.id === recipient.id) {
      return;
    }

    // Check if the comment author has this notification type enabled
    if (
      !recipient.subscribedToEventType(NotificationEventType.ReactionsCreate)
    ) {
      return;
    }

    // Check if the comment author can access the document
    if (!(await canUserAccessDocument(recipient, document.id))) {
      return;
    }

    const existing = await Notification.findOne({
      where: {
        event: NotificationEventType.ReactionsCreate,
        userId: recipient.id,
        commentId: comment.id,
      },
    });

    if (existing) {
      // If a notification already exists for this reaction, update it
      // as we have a unique constraint on userId, commentId, and event.
      await existing.update({
        viewedAt: null,
        archivedAt: null,
        actorId: actor.id,
        data: { emoji },
      });
      return;
    }

    // Create the notification
    await Notification.create({
      event: NotificationEventType.ReactionsCreate,
      userId: recipient.id,
      actorId: actor.id,
      teamId: document.teamId,
      commentId: comment.id,
      documentId: document.id,
      data: { emoji },
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
