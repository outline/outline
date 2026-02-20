import { Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import { Group, GroupUser, Notification, User } from "@server/models";
import type { CommentEvent } from "@server/types";
import { canUserAccessDocument } from "@server/utils/permissions";
import { BaseTask, TaskPriority } from "./base/BaseTask";

type GroupMentionEvent = Omit<CommentEvent, "data"> & {
  data: {
    groupId: string;
    actorId: string;
  };
};

export default class GroupMentionedInCommentNotificationsTask extends BaseTask<GroupMentionEvent> {
  public async perform(event: GroupMentionEvent) {
    const { groupId, actorId } = event.data;

    // Defensive check: ensure group has mentions enabled.
    // This is also checked in the parent task, but we verify here
    // for resilience in case this task is scheduled directly.
    const groupModel = await Group.findByPk(groupId);
    if (groupModel?.disableMentions) {
      return;
    }

    // Process group members in batches for scalability
    await GroupUser.findAllInBatches<GroupUser>(
      {
        where: {
          groupId,
          userId: {
            [Op.ne]: actorId,
          },
        },
        order: [["permission", "ASC"]],
        batchLimit: 10,
      },
      async (groupUsers) => {
        // Batch fetch all users to reduce database queries
        const userIds = groupUsers.map((gu) => gu.userId);
        const users = await User.findAll({
          where: {
            id: userIds,
          },
        });

        // Create a map for quick user lookup
        const userMap = new Map(users.map((u) => [u.id, u]));

        // Process notifications for this batch (limited to 10 concurrent operations
        // by the batch size to avoid overwhelming the database connection pool)
        await Promise.all(
          groupUsers.map(async (groupUser) => {
            const recipient = userMap.get(groupUser.userId);
            if (
              recipient &&
              recipient.subscribedToEventType(
                NotificationEventType.GroupMentionedInComment
              ) &&
              (await canUserAccessDocument(recipient, event.documentId))
            ) {
              await Notification.create({
                event: NotificationEventType.GroupMentionedInComment,
                groupId,
                userId: recipient.id,
                actorId,
                teamId: event.teamId,
                documentId: event.documentId,
                commentId: event.modelId,
              });
            }
          })
        );
      }
    );
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
