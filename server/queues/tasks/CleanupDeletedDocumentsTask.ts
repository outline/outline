import { subDays } from "date-fns";
import { Op, Sequelize } from "sequelize";
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
      `Permanently destroying upto ${limit} documents past retention or trash timeout…`
    );

    // 1. Mark documents that have been in the trash for more than 30 days as permanentlyDeletedAt = now()
    // This moves them from "Trash" to "Pending Permanent Deletion" (Retention phase)
    await Document.unscoped().update(
      {
        permanentlyDeletedAt: new Date(),
      },
      {
        where: {
          deletedAt: {
            [Op.lt]: subDays(new Date(), 30),
          },
          permanentlyDeletedAt: {
            [Op.is]: null,
          },
          ...this.getPartitionWhereClause("id", partition),
        },
        paranoid: false,
      }
    );

    // 2. Find documents where permanentlyDeletedAt is older than the team's configured retention period
    const documents = await Document.scope([
      "withDrafts",
      "withoutState",
    ]).findAll({
      where: {
        permanentlyDeletedAt: {
          [Op.lt]: Sequelize.literal(
            `now() - (COALESCE((SELECT (preferences->>'documentRetentionDays')::int FROM teams WHERE teams.id = "document"."teamId"), 30) || ' days')::interval`
          ),
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
