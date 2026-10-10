import { NotificationEventType } from "@shared/types";
import { createContext } from "@server/context";
import { Group, Notification, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { GroupUserEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";

/**
 * Notifies a user when another user adds them to or removes them from a group
 * that is not managed by an external provider.
 */
export default class GroupUserNotificationsTask extends BaseTask<GroupUserEvent> {
  public async perform(event: GroupUserEvent) {
    const notificationEvent =
      GroupUserNotificationsTask.notificationEvents[event.name];
    if (!notificationEvent) {
      return;
    }

    await this.deleteUnreadNotifications(event);

    // Additions and removals share a single preference.
    const recipient = await User.findByPk(event.userId);
    if (
      !recipient ||
      recipient.isSuspended ||
      !recipient.subscribedToEventType(NotificationEventType.AddUserToGroup)
    ) {
      return;
    }

    // Memberships of externally managed groups only change through sync.
    const group = await Group.findByPk(event.modelId);
    if (!group || group.externalId) {
      return;
    }

    await Notification.create({
      event: notificationEvent,
      userId: event.userId,
      actorId: event.actorId,
      teamId: event.teamId,
      groupId: group.id,
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }

  /** The notification type for each group membership event. */
  private static notificationEvents: Record<
    GroupUserEvent["name"],
    NotificationEventType
  > = {
    "groups.add_user": NotificationEventType.AddUserToGroup,
    "groups.remove_user": NotificationEventType.RemoveUserFromGroup,
  };

  /**
   * Deletes the user's unread membership notifications for the group, so that
   * only the latest change is shown.
   *
   * @param event The group membership event.
   */
  private async deleteUnreadNotifications(event: GroupUserEvent) {
    const actor = await User.findByPk(event.actorId);

    await sequelize.transaction((transaction) =>
      Notification.destroyWithCtx(
        createContext({
          user: actor ?? undefined,
          authType: event.authType,
          ip: event.ip,
          transaction,
        }),
        {
          where: {
            event: Object.values(GroupUserNotificationsTask.notificationEvents),
            userId: event.userId,
            groupId: event.modelId,
            viewedAt: null,
          },
        }
      )
    );
  }
}
