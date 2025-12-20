import { Op, Sequelize } from "sequelize";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import { TeamPreference } from "@shared/types";
import type { Props } from "./base/CronTask";

export default class CleanupDeletedDocumentsTask extends CronTask {
  public async perform({ limit, partition }: Props) {
    Logger.info(
      "task",
      `Permanently destroying upto ${limit} documents past retention timeout…`
    );

    // Find documents where permanentlyDeletedAt is older than the team's configured document retention period
    const documents = await Document.scope([
      "withDrafts",
      "withoutState",
    ]).findAll({
      where: {
        permanentlyDeletedAt: {
          [Op.lt]: Sequelize.literal(
            `now() - (COALESCE((SELECT (preferences->>'${TeamPreference.DataRetentionDays}')::int FROM teams WHERE teams.id = "document"."teamId"), 30) || ' days')::interval`
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
