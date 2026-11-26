import { NotificationEventType } from "@shared/types";
import { Collection, Notification, User } from "@server/models";
import { can } from "@server/policies";
import type { CollectionOwnerEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";

/**
 * Notification task that notifies a user when they are made an owner of a
 * collection.
 */
export default class CollectionAddOwnerNotificationsTask extends BaseTask<CollectionOwnerEvent> {
  public async perform(event: CollectionOwnerEvent) {
    const recipient = await User.findByPk(event.userId);
    if (
      !recipient ||
      recipient.isSuspended ||
      !recipient.subscribedToEventType(
        NotificationEventType.AddOwnerToCollection
      )
    ) {
      return;
    }

    const collection = await Collection.findByPk(event.collectionId, {
      userId: recipient.id,
    });
    if (
      !collection?.ownerIds?.includes(recipient.id) ||
      !can(recipient, "read", collection)
    ) {
      return;
    }

    await Notification.create({
      event: NotificationEventType.AddOwnerToCollection,
      userId: recipient.id,
      actorId: event.actorId,
      teamId: event.teamId,
      collectionId: collection.id,
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
