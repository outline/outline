import { DocumentPermission, NotificationEventType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Notification, User } from "@server/models";
import { DocumentUserEvent } from "@server/types";
import { isElevatedPermission } from "@server/utils/permissions";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class DocumentAddUserNotificationsTask extends BaseTask<DocumentUserEvent> {
  public async perform(event: DocumentUserEvent) {
    const permission = event.changes?.attributes.permission as
      | DocumentPermission
      | undefined;

    if (!permission) {
      Logger.info(
        "task",
        `permission not available in the DocumentAddUserNotificationsTask event`,
        {
          name: event.name,
          modelId: event.modelId,
        }
      );
      return;
    }

    const recipient = await User.findByPk(event.userId);
    if (
      !recipient ||
      recipient.isSuspended ||
      !recipient.subscribedToEventType(NotificationEventType.AddUserToDocument)
    ) {
      return;
    }

    const isElevated = await isElevatedPermission({
      userId: recipient.id,
      documentId: event.documentId,
      permission,
      skipMembershipId: event.modelId,
    });

    if (!isElevated) {
      Logger.debug(
        "task",
        `Suppressing notification for user ${event.userId} as the new permission does not elevate user's permission to the document`,
        {
          documentId: event.documentId,
          userId: event.userId,
          permission,
        }
      );
      return;
    }

    await Notification.create({
      event: NotificationEventType.AddUserToDocument,
      userId: event.userId,
      actorId: event.actorId,
      teamId: event.teamId,
      documentId: event.documentId,
      membershipId: event.modelId,
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
