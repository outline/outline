import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Event } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, Props, TaskInterval } from "./base/CronTask";
import { Minute } from "@shared/utils/time";

export default class CleanupOldEventsTask extends CronTask {
  public async perform({ partition }: Props) {
    // TODO: Hardcoded right now, configurable later
    const retentionDays = 365;
    const cutoffDate = subDays(new Date(), retentionDays);
    const maxEventsPerTask = 100000;
    let totalEventsDeleted = 0;

    try {
      await Event.findAllInBatches(
        {
          attributes: ["id"],
          where: {
            createdAt: {
              [Op.lt]: cutoffDate,
            },
            ...this.getPartitionWhereClause("id", partition),
          },
          batchLimit: 1000,
          totalLimit: maxEventsPerTask,
          order: [["createdAt", "ASC"]],
        },
        async (events) => {
          totalEventsDeleted += await Event.destroy({
            where: {
              id: {
                [Op.in]: events.map((event) => event.id),
              },
            },
          });
        }
      );
    } finally {
      if (totalEventsDeleted > 0) {
        Logger.info("task", `Deleted old events`, {
          totalEventsDeleted,
        });
      }
    }
  }

  public get cron() {
    return {
      interval: TaskInterval.Hour,
      partitionWindow: 15 * Minute.ms,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
