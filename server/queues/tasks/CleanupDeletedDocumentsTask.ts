import { subDays } from "date-fns";
import { Op } from "sequelize";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import { Minute } from "@shared/utils/time";
import { CronTask, Props, TaskInterval } from "./base/CronTask";

export default class CleanupDeletedDocumentsTask extends CronTask {
  public async perform({ limit, partition }: Props) {
    Logger.info(
      "task",
      `Permanently destroying upto ${limit} documents older than 30 days…`
    );
    const documents = await Document.scope([
      "withDrafts",
      "withoutState",
    ]).findAll({
      where: {
        deletedAt: {
          [Op.lt]: subDays(new Date(), 30),
        },
        ...this.getPartitionWhereClause("id", partition),
      },
      paranoid: false,
      limit,
    });
    const countDeletedDocument = await documentPermanentDeleter(documents);
    Logger.info("task", `Destroyed ${countDeletedDocument} documents`);
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }

  public get cron() {
    return {
      interval: TaskInterval.Hour,
      partitionWindow: 15 * Minute.ms,
    };
  }
}
