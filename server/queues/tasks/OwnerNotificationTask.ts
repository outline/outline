import { NotificationEventType } from "@shared/types";
import { Document, Notification, User } from "@server/models";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type Props = {
  documentId: string;
  ownerId: string;
  changedById: string;
  changeType: string;
  eventName: string;
};

/**
 * Task to send notifications to document owners when their documents
 * are changed by other users.
 */
export default class OwnerNotificationTask extends BaseTask<Props> {
  public async perform({ documentId, ownerId, changedById, changeType, eventName }: Props) {
    const [document, owner, changedBy] = await Promise.all([
      Document.findByPk(documentId, { paranoid: false }),
      User.findByPk(ownerId, { paranoid: false }),
      User.findByPk(changedById, { paranoid: false }),
    ]);

    if (!document || !owner || !changedBy) {
      return;
    }

    // Don't send notification if owner is suspended
    if (owner.isSuspended) {
      return;
    }

    // Check if owner has access to the document
    if (!(await canUserAccessDocument(owner, documentId))) {
      return;
    }

    // Check if owner is subscribed to this event type
    if (!owner.subscribedToEventType(NotificationEventType.DocumentChangedByOtherUser)) {
      return;
    }

    // Don't send notification if owner is the one who made the change
    if (ownerId === changedById) {
      return;
    }

    // Create notification for the owner
    await Notification.create({
      event: NotificationEventType.DocumentChangedByOtherUser,
      userId: ownerId,
      actorId: changedById,
      teamId: document.teamId,
      documentId: document.id,
    });
  }
}
