import isUndefined from "lodash/isUndefined";
import { Event, Notification } from "@server/models";
import { APIContext } from "@server/types";

type Props = {
  /** Notification to be updated */
  notification: Notification;
  /** Time at which notification was viewed */
  viewedAt?: Date | null;
  /** Time at which notification was archived */
  archivedAt?: Date | null;
};

/**
 * This command updates notification properties.
 *
 * @param ctx The originating request context
 * @param Props The properties of the notification to update
 * @returns Notification The updated notification
 */
export default async function notificationUpdater(
  ctx: APIContext,
  { notification, viewedAt, archivedAt }: Props
): Promise<Notification> {
  const { transaction } = ctx.state;

  if (!isUndefined(viewedAt)) {
    notification.viewedAt = viewedAt;
  }
  if (!isUndefined(archivedAt)) {
    notification.archivedAt = archivedAt;
  }
  const changed = notification.changed();
  if (changed) {
    await notification.save({ transaction });

    await Event.createFromContext(
      ctx,
      {
        name: "notifications.update",
        userId: notification.userId,
        modelId: notification.id,
        documentId: notification.documentId,
      },
      {
        actorId: notification.userId,
        teamId: notification.teamId,
      }
    );
  }

  return notification;
}
