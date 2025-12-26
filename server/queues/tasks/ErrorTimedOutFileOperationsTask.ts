import { subHours } from "date-fns";
import { Op } from "sequelize";
import { FileOperationState } from "@shared/types";
import Logger from "@server/logging/Logger";
import { FileOperation } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

export default class ErrorTimedOutFileOperationsTask extends CronTask {
  public async perform({ limit }: Props) {
    Logger.info("task", `Error file operations running longer than 12 hours…`);
    const fileOperations = await FileOperation.unscoped().findAll({
      where: {
        createdAt: {
          [Op.lt]: subHours(new Date(), 12),
        },
        [Op.or]: [
          {
            state: FileOperationState.Creating,
          },
          {
            state: FileOperationState.Uploading,
          },
        ],
      },
      limit,
    });
    await Promise.all(
      fileOperations.map(async (fileOperation) => {
        fileOperation.state = FileOperationState.Error;
        fileOperation.error = "Timed out";
        await fileOperation.save({ hooks: false });
      })
    );
    Logger.info("task", `Updated ${fileOperations.length} file operations`);
  }

  public get cron() {
    return {
      interval: TaskInterval.Hour,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
