import { subDays } from "date-fns";
import { Op } from "sequelize";
import { ImportTaskState } from "@shared/types";
import Logger from "@server/logging/Logger";
import { ImportTask } from "@server/models";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";

type Props = Record<string, never>;

/**
 * A task that deletes the completed & errored old import_tasks.
 */
export default class CleanupOldImportsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Day;

  public async perform() {
    // TODO: Hardcoded right now, configurable later
    const retentionDays = 1;
    const cutoffDate = subDays(new Date(), retentionDays);
    const maxEventsPerTask = 100000;
    let totalTasksDeleted = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ImportTask.findAllInBatches<ImportTask<any>>(
        {
          attributes: ["id"],
          where: {
            state: [
              ImportTaskState.Completed,
              ImportTaskState.Errored,
              ImportTaskState.Canceled,
            ],
            createdAt: {
              [Op.lt]: cutoffDate,
            },
          },
          order: [
            ["createdAt", "ASC"],
            ["id", "ASC"],
          ],
          batchLimit: 1000,
          totalLimit: maxEventsPerTask,
        },
        async (importTasks) => {
          totalTasksDeleted += await ImportTask.destroy({
            where: {
              id: {
                [Op.in]: importTasks.map((importTask) => importTask.id),
              },
            },
          });
        }
      );
    } finally {
      if (totalTasksDeleted > 0) {
        Logger.info("task", `Deleted old import_tasks`, {
          totalTasksDeleted,
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
