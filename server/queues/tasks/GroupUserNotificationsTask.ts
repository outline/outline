import { NotificationEventType } from "@shared/types";
import { Group, Notification, User } from "@server/models";
import type { GroupUserEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";

/**
 * Notifies a user when another user adds them to or removes them from a group
 * that is not managed by an external provider.
 */
export default class GroupUserNotificationsTask extends BaseTask<GroupUserEvent> {
  public async perform(event: GroupUserEvent) {
    const notificationEvent =
      event.name === "groups.add_user"
        ? NotificationEventType.AddUserToGroup
        : NotificationEventType.RemoveUserFromGroup;

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
}
