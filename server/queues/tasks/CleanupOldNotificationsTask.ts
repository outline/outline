import { subMonths } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Notification } from "@server/models";
import BaseTask, {
  CronTaskProps as Props,
  TaskPriority,
  TaskSchedule,
} from "./BaseTask";
import { Minute } from "@shared/utils/time";

export default class CleanupOldNotificationsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

  static cronPartitionWindow = 15 * Minute.ms;

  public async perform({ partition }: Props) {
    Logger.info("task", `Permanently destroying old notifications…`);
    let count;

    count = await Notification.destroy({
      where: {
        createdAt: {
          [Op.lt]: subMonths(new Date(), 12),
        },
        ...this.getPartitionWhereClause("id", partition),
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
        ...this.getPartitionWhereClause("id", partition),
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
