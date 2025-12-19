import { Op, Sequelize } from "sequelize";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, Props, TaskInterval } from "./base/CronTask";

export default class MarkPermanentlyDeletedDocumentsTask extends CronTask {
  public async perform({ partition }: Props) {
    Logger.info(
      "task",
      "Marking documents past trash timeout as pending permanent deletion…"
    );

    // Mark documents that have been in the trash for longer than the team's configured trash retention period.
    // This moves them from "Trash" to "Pending Permanent Deletion" (Retention phase).
    const [count] = await Document.unscoped().update(
      {
        permanentlyDeletedAt: new Date(),
      },
      {
        where: {
          deletedAt: {
            [Op.lt]: Sequelize.literal(
              `now() - (COALESCE((SELECT (preferences->>'trashRetentionDays')::int FROM teams WHERE teams.id = "documents"."teamId"), 30) || ' days')::interval`
            ),
          },
          permanentlyDeletedAt: {
            [Op.is]: null,
          },
          ...this.getPartitionWhereClause("id", partition),
        },
        paranoid: false,
      }
    );

    if (count > 0) {
      Logger.info("task", `Marked ${count} documents for permanent deletion`);
    }
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
