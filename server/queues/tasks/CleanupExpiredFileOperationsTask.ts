import { subDays } from "date-fns";
import { Op } from "sequelize";
import { FileOperationState } from "@shared/types";
import Logger from "@server/logging/Logger";
import { FileOperation } from "@server/models";
import BaseTask, {
  PartitionInfo,
  TaskPriority,
  TaskSchedule,
} from "./BaseTask";

type Props = {
  limit: number;
  partition?: PartitionInfo;
};

export default class CleanupExpiredFileOperationsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

  public async perform({ limit, partition }: Props) {
    const partitionInfo = partition
      ? ` (partition ${partition.partitionIndex + 1}/${partition.partitionCount})`
      : "";
    Logger.info(
      "task",
      `Expiring file operations older than 15 days${partitionInfo}…`
    );
    const fileOperations = await FileOperation.unscoped().findAll({
      where: {
        createdAt: {
          [Op.lt]: subDays(new Date(), 15),
        },
        state: {
          [Op.ne]: FileOperationState.Expired,
        },
        ...this.getPartitionWhereClause("id", partition),
      },
      limit,
    });
    await Promise.all(
      fileOperations.map((fileOperation) => fileOperation.expire())
    );
    Logger.info(
      "task",
      `Expired ${fileOperations.length} file operations${partitionInfo}`
    );
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
