import { NotificationEventType } from "@shared/types";
import { Collection, Notification, User } from "@server/models";
import type { CollectionUserEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";

export default class CollectionAddUserNotificationsTask extends BaseTask<CollectionUserEvent> {
  public async perform(event: CollectionUserEvent) {
    const recipient = await User.findByPk(event.userId);
    if (!recipient) {
      return;
    }

    // Owners receive a notification for being made an owner instead.
    if (
      recipient.subscribedToEventType(
        NotificationEventType.AddOwnerToCollection
      )
    ) {
      const collection = await Collection.unscoped().findByPk(
        event.collectionId,
        { attributes: ["id", "ownerIds"] }
      );
      if (collection?.ownerIds?.includes(recipient.id)) {
        return;
      }
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
