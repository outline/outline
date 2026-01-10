import { subDays } from "date-fns";
import { Op } from "sequelize";
import { ImportState } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Import, ImportTask } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * A task that deletes the import_tasks for old imports which are completed, errored (or) canceled.
 */
export default class CleanupOldImportsTask extends CronTask {
  public async perform() {
    // TODO: Hardcoded right now, configurable later
    const retentionDays = 1;
    const cutoffDate = subDays(new Date(), retentionDays);
    const maxImportsPerTask = 1000;
    let totalTasksDeleted = 0;

    try {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      await Import.findAllInBatches<Import<any>>(
        {
          attributes: ["id"],
          where: {
            state: [
              ImportState.Completed,
              ImportState.Errored,
              ImportState.Canceled,
            ],
            createdAt: {
              [Op.lt]: cutoffDate,
            },
          },
          order: [
            ["createdAt", "ASC"],
            ["id", "ASC"],
          ],
          batchLimit: 50,
          totalLimit: maxImportsPerTask,
          paranoid: false,
        },
        async (imports) => {
          // oxlint-disable-next-line @typescript-eslint/no-explicit-any
          await ImportTask.findAllInBatches<ImportTask<any>>(
            {
              attributes: ["id"],
              where: {
                importId: imports.map((importModel) => importModel.id),
              },
              order: [
                ["createdAt", "ASC"],
                ["id", "ASC"],
              ],
              batchLimit: 1000,
            },
            async (importTasks) => {
              totalTasksDeleted += await ImportTask.destroy({
                where: {
                  id: importTasks.map((importTask) => importTask.id),
                },
              });
            }
          );
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

  public get cron() {
    return {
      interval: TaskInterval.Day,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
