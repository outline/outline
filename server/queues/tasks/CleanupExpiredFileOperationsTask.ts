import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/logger";
import { APM } from "@server/logging/tracing";
import { FileOperation } from "@server/models";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  limit: number;
};

@APM.trace()
export default class CleanupExpiredFileOperationsTask extends BaseTask<Props> {
  public async perform({ limit }: Props) {
    Logger.info("task", `Expiring export file operations older than 30 days…`);
    const fileOperations = await FileOperation.unscoped().findAll({
      where: {
        type: "export",
        createdAt: {
          [Op.lt]: subDays(new Date(), 30),
        },
        state: {
          [Op.ne]: "expired",
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
