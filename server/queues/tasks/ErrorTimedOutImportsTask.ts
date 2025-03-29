import { subHours } from "date-fns";
import { Op } from "sequelize";
import { ImportState, ImportTaskState } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Import, ImportTask } from "@server/models";
import { sequelize } from "@server/storage/database";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";

type Props = {
  limit: number;
};

/**
 * A task that moves the stuck imports to errored state.
 */
export default class ErrorTimedOutImportsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

  public async perform({ limit }: Props) {
    // TODO: Hardcoded right now, configurable later
    const thresholdHours = 12;
    const cutOffTime = subHours(new Date(), thresholdHours);
    const importsErrored: Record<string, boolean> = {};

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ImportTask.findAllInBatches<ImportTask<any>>(
        {
          where: {
            state: [ImportTaskState.Created, ImportTaskState.InProgress],
            createdAt: {
              [Op.lt]: cutOffTime,
            },
          },
          include: [
            {
              model: Import.unscoped(),
              as: "import",
              required: true,
            },
          ],
          order: [
            ["createdAt", "ASC"],
            ["id", "ASC"],
          ],
          batchLimit: 1000,
          totalLimit: limit,
        },
        async (importTasks) => {
          for (const importTask of importTasks) {
            const associatedImport = importTask.import;

            if (associatedImport.state === ImportState.Canceled) {
              continue; // import_tasks for a canceled import are not considered stuck.
            }

            await sequelize.transaction(async (transaction) => {
              importTask.state = ImportTaskState.Errored;
              importTask.error = "Timed out";
              await importTask.save({ transaction });

              // this import could have been seen before in another import_task.
              if (!importsErrored[associatedImport.id]) {
                associatedImport.state = ImportState.Errored;
                associatedImport.error = "Timed out";
                await associatedImport.save({ transaction });
                importsErrored[associatedImport.id] = true;
              }
            });
          }
        }
      );
    } finally {
      const totalImportsErrored = Object.keys(importsErrored).length;

      if (totalImportsErrored > 0) {
        Logger.info(
          "task",
          `Updated ${totalImportsErrored} imports to error status`
        );
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
