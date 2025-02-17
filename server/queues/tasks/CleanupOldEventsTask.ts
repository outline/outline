import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Event } from "@server/models";
import BaseTask, {
  TaskPriority,
  TaskSchedule,
} from "@server/queues/tasks/BaseTask";

type Props = Record<string, never>;

export default class CleanupOldEventsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

  public async perform() {
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

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
