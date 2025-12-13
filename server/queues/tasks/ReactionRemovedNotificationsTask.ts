import { NotificationEventType } from "@shared/types";
import { Notification, User } from "@server/models";
import { CommentReactionEvent } from "@server/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";
import { createContext } from "@server/context";
import { sequelize } from "@server/storage/database";
import { Op } from "sequelize";

export default class ReactionRemovedNotificationsTask extends BaseTask<CommentReactionEvent> {
  public async perform(event: CommentReactionEvent) {
    const { emoji } = event.data;

    if (event.name !== "comments.remove_reaction") {
      return;
    }

    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(event.actorId, {
        rejectOnEmpty: true,
        transaction,
      });

      const notifications = await Notification.findAll({
        lock: {
          level: transaction.LOCK.UPDATE,
          of: Notification,
        },
        where: {
          actorId: event.actorId,
          commentId: event.modelId,
          viewedAt: {
            [Op.eq]: null, // Only target notifications that haven't been viewed
          },
          event: NotificationEventType.ReactionsCreate,
          data: {
            emoji,
          },
        },
      });

      const ctx = createContext({
        user,
        transaction,
      });

      await Promise.all(
        notifications.map(async (notification) =>
          notification.updateWithCtx(ctx, { archivedAt: new Date() })
        )
      );
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
