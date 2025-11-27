import { subDays } from "date-fns";
import { Op } from "sequelize";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import BaseTask, {
  CronTaskProps as Props,
  TaskPriority,
  TaskSchedule,
} from "./BaseTask";
import { Minute } from "@shared/utils/time";

export default class CleanupDeletedDocumentsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

  static cronPartitionWindow = 15 * Minute.ms;

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
}
