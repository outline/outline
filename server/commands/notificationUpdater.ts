import { isUndefined } from "lodash";
import { Transaction } from "sequelize";
import { Event, Notification } from "@server/models";

type Props = {
  /** Notification to be updated */
  notification: Notification;
  /** Time at which notification was viewed */
  viewedAt?: Date | null;
  /** Time at which notification was archived */
  archivedAt?: Date | null;
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
  viewedAt,
  archivedAt,
  ip,
  transaction,
}: Props): Promise<Notification> {
  if (!isUndefined(viewedAt)) {
    notification.viewedAt = viewedAt;
  }
  if (!isUndefined(archivedAt)) {
    notification.archivedAt = archivedAt;
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
