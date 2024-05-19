import { NotificationEventType } from "@shared/types";
import { Notification, User } from "@server/models";
import { CollectionUserEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class CollectionAddUserNotificationsTask extends BaseTask<CollectionUserEvent> {
  public async perform(event: CollectionUserEvent) {
    const recipient = await User.findByPk(event.userId);
    if (!recipient) {
      return;
    }

    if (
      !recipient.isSuspended &&
      recipient.subscribedToEventType(NotificationEventType.AddUserToCollection)
    ) {
      await Notification.create({
        event: NotificationEventType.AddUserToCollection,
        userId: event.userId,
        actorId: event.actorId,
        teamId: event.teamId,
        collectionId: event.collectionId,
      });
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
