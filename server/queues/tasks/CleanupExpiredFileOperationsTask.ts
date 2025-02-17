import { subDays } from "date-fns";
import { Op } from "sequelize";
import { FileOperationState } from "@shared/types";
import Logger from "@server/logging/Logger";
import { FileOperation } from "@server/models";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";

type Props = {
  limit: number;
};

export default class CleanupExpiredFileOperationsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

  public async perform({ limit }: Props) {
    Logger.info("task", `Expiring file operations older than 15 days…`);
    const fileOperations = await FileOperation.unscoped().findAll({
      where: {
        createdAt: {
          [Op.lt]: subDays(new Date(), 15),
        },
        state: {
          [Op.ne]: FileOperationState.Expired,
        },
      },
      limit,
    });
    await Promise.all(
      fileOperations.map((fileOperation) => fileOperation.expire())
    );
    Logger.info("task", `Expired ${fileOperations.length} file operations`);
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
