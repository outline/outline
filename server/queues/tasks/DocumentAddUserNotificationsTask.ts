import { NotificationEventType } from "@shared/types";
import { Notification, User } from "@server/models";
import { DocumentUserEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class DocumentAddUserNotificationsTask extends BaseTask<DocumentUserEvent> {
  public async perform(event: DocumentUserEvent) {
    const recipient = await User.findByPk(event.userId);
    if (!recipient) {
      return;
    }

    if (
      !recipient.isSuspended &&
      recipient.subscribedToEventType(NotificationEventType.AddUserToDocument)
    ) {
      await Notification.create({
        event: NotificationEventType.AddUserToDocument,
        userId: event.userId,
        actorId: event.actorId,
        teamId: event.teamId,
        documentId: event.documentId,
      });
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
