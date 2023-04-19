import { Transaction } from "sequelize";
import { Event, Notification } from "@server/models";

type Props = {
  /** Notification to be updated */
  notification: Notification;
  /** Mark the notification as viewed */
  markAsViewed?: boolean | null;
  /** Whether to archive the notification */
  archive?: boolean | null;
  /** The IP address of the user updating the notification */
  ip: string;
  /** The database transaction to run within */
  transaction: Transaction;
};

/**
 * This command updates notification properties.
 *
 * @param Props The properties of the notification to update
 * @returns Notification The updated notification
 */
export default async function notificationUpdater({
  notification,
  markAsViewed,
  archive,
  ip,
  transaction,
}: Props): Promise<Notification> {
  if (markAsViewed) {
    notification.viewedAt = new Date();
  }
  if (archive) {
    notification.archivedAt = new Date();
  }
  const changed = notification.changed();
  if (changed) {
    await notification.save({ transaction });

    await Event.create(
      {
        name: "notifications.update",
        userId: notification.userId,
        modelId: notification.id,
        teamId: notification.teamId,
        documentId: notification.documentId,
        actorId: notification.actorId,
        ip,
      },
      { transaction }
    );
  }

  return notification;
}
