import { NotificationEventType } from "@shared/types";
import { Collection, Notification } from "@server/models";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { CollectionEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class CollectionCreatedNotificationsTask extends BaseTask<CollectionEvent> {
  public async perform(event: CollectionEvent) {
    const collection = await Collection.findByPk(event.collectionId);

    // We only send notifications for collections visible to the entire team
    if (!collection || collection.isPrivate) {
      return;
    }

    if ("source" in event.data && event.data.source === "import") {
      return;
    }

    const recipients =
      await NotificationHelper.getCollectionNotificationRecipients(
        collection,
        NotificationEventType.CreateCollection
      );

    for (const recipient of recipients) {
      // Suppress notifications for suspended users
      if (recipient.isSuspended || !recipient.email) {
        continue;
      }

      await Notification.create({
        event: NotificationEventType.CreateCollection,
        userId: recipient.id,
        collectionId: collection.id,
        actorId: collection.createdById,
        teamId: collection.teamId,
      });
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
