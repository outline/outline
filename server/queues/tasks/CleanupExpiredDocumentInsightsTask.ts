import { Op, literal } from "sequelize";
import { Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { DocumentInsight } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Number of days of rollup history to retain.
 */
const RETENTION_DAYS = 365;

export default class CleanupExpiredDocumentInsightsTask extends CronTask {
  public async perform() {
    // Derive the cutoff in UTC from the database so retention isn't affected
    // by the worker's local timezone. `date` is stored as a UTC DATE.
    const cutoff = literal(
      `(NOW() AT TIME ZONE 'UTC')::date - INTERVAL '${RETENTION_DAYS} days'`
    );
    const deleted = await DocumentInsight.destroy({
      where: { date: { [Op.lt]: cutoff } },
    });

    if (deleted > 0) {
      Logger.info("task", `Deleted ${deleted} expired document_insights rows`);
    }
  }

  public get cron() {
    return {
      interval: TaskInterval.Day,
      partitionWindow: 30 * Minute.ms,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
