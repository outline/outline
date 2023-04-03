import { NotificationEventType } from "@shared/types";
import { Collection, Notification } from "@server/models";
import NotificationHelper from "@server/models/helpers/NotificationHelper";
import { CollectionEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class CollectionCreatedNotificationTask extends BaseTask<
  CollectionEvent
> {
  public async perform(event: CollectionEvent) {
    const collection = await Collection.scope("withUser").findByPk(
      event.collectionId
    );

    if (!collection || !collection.permission) {
      return;
    }

    const recipients = await NotificationHelper.getCollectionNotificationRecipients(
      collection,
      NotificationEventType.CreateCollection
    );

    for (const recipient of recipients) {
      // Suppress notifications for suspended users
      if (recipient.isSuspended || !recipient.email) {
        continue;
      }

      await Notification.create({
        event: event.name,
        userId: recipient.id,
        actorId: collection.createdById,
        teamId: collection.teamId,
      });

      // await new CollectionCreatedEmail({
      //   to: recipient.email,
      //   userId: recipient.id,
      //   collectionId: collection.id,
      // }).schedule();
    }
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
