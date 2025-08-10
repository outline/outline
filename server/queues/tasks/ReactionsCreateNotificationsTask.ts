import { NotificationEventType } from "@shared/types";
import { Comment, Document, Notification, User } from "@server/models";
import { CommentReactionEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class ReactionsCreateNotificationsTask extends BaseTask<CommentReactionEvent> {
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
    const reactor = await User.findByPk(event.actorId);
    if (!reactor) {
      return;
    }

    // Get the comment author (the recipient of the notification)
    const commentAuthor = await User.findByPk(comment.createdById);
    if (!commentAuthor) {
      return;
    }

    // Don't notify if the user reacted to their own comment
    if (reactor.id === commentAuthor.id) {
      return;
    }

    // Check if the comment author has this notification type enabled
    if (
      !commentAuthor.subscribedToEventType(
        NotificationEventType.ReactionsCreate
      )
    ) {
      return;
    }

    // Check if the comment author can access the document
    if (!(await canUserAccessDocument(commentAuthor, document.id))) {
      return;
    }

    // Create the notification
    await Notification.create({
      event: NotificationEventType.ReactionsCreate,
      userId: commentAuthor.id,
      actorId: reactor.id,
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
