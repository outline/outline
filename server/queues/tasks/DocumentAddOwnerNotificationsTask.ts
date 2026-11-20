import { NotificationEventType } from "@shared/types";
import { Document, Notification, User } from "@server/models";
import type { DocumentOwnerEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";

/**
 * Notification task that notifies a user when they are made an owner of a
 * document.
 */
export default class DocumentAddOwnerNotificationsTask extends BaseTask<DocumentOwnerEvent> {
  public async perform(event: DocumentOwnerEvent) {
    const [recipient, document] = await Promise.all([
      User.findByPk(event.userId),
      Document.findByPk(event.documentId),
    ]);

    if (
      !recipient ||
      !document ||
      recipient.isSuspended ||
      !document.ownerIds?.includes(recipient.id) ||
      !recipient.subscribedToEventType(NotificationEventType.AddOwnerToDocument)
    ) {
      return;
    }

    if (!(await canUserAccessDocument(recipient, document.id))) {
      return;
    }

    await Notification.create({
      event: NotificationEventType.AddOwnerToDocument,
      userId: recipient.id,
      actorId: event.actorId,
      teamId: event.teamId,
      documentId: document.id,
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
