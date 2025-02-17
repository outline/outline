import { subMonths } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Notification } from "@server/models";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";

type Props = Record<string, never>;

export default class CleanupOldNotificationsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

  public async perform() {
    Logger.info("task", `Permanently destroying old notifications…`);
    let count;

    count = await Notification.destroy({
      where: {
        createdAt: {
          [Op.lt]: subMonths(new Date(), 12),
        },
      },
    });

    Logger.info(
      "task",
      `Destroyed ${count} notifications older than 12 months…`
    );

    count = await Notification.destroy({
      where: {
        viewedAt: {
          [Op.ne]: null,
        },
        createdAt: {
          [Op.lt]: subMonths(new Date(), 6),
        },
      },
    });

    Logger.info(
      "task",
      `Destroyed ${count} viewed notifications older than 6 months…`
    );
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
