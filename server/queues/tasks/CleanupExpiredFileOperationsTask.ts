import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { FileOperation } from "@server/models";
import { FileOperationState } from "@server/models/FileOperation";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  limit: number;
};

export default class CleanupExpiredFileOperationsTask extends BaseTask<Props> {
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
