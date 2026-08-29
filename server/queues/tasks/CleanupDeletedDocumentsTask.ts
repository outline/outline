import { subDays } from "date-fns";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { sequelizeReadOnly } from "@server/storage/database";
import { TaskPriority } from "./base/BaseTask";
import { Minute } from "@shared/utils/time";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

export default class CleanupDeletedDocumentsTask extends CronTask {
  public async perform({ limit, partition }: Props) {
    Logger.info(
      "task",
      `Permanently destroying upto ${limit} documents older than 30 days…`
    );

    const [startId, endId] = this.getPartitionBounds(partition);

    // Candidates are read from the replica, the deletion itself still runs on
    // the primary.
    const documents = await sequelizeReadOnly.query(
      `
      SELECT
        "id",
        "teamId",
        "deletedAt",
        "content",
        CASE WHEN "content" IS NULL THEN "state" END AS "state",
        CASE WHEN "content" IS NULL AND "state" IS NULL THEN "text" END AS "text"
      FROM "documents"
      WHERE "deletedAt" < :threshold
        AND "id" >= :startId::uuid
        AND "id" <= :endId::uuid
      LIMIT :limit
      `,
      {
        replacements: {
          threshold: subDays(new Date(), 30),
          startId,
          endId,
          limit,
        },
        model: Document,
        mapToModel: true,
      }
    );

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
