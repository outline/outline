import { QueryTypes } from "sequelize";
import { Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { DocumentInsight } from "@server/models";
import { DocumentInsightPeriod } from "@server/models/DocumentInsight";
import { sequelize } from "@server/storage/database";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Daily rows older than this threshold are collapsed into weekly rollups to
 * keep the table size manageable. Recent data remains at daily granularity.
 */
const CUTOFF_DAYS = 30;

export default class RollupWeeklyDocumentInsightsTask extends CronTask {
  public async perform({ partition }: Props) {
    const [startUuid, endUuid] = this.getPartitionBounds(partition);

    // Find ISO week starts (Monday) whose Sunday end is older than the cutoff
    // and still have daily rows inside this partition. Postgres `date_trunc`
    // uses ISO weeks, so the result is always a Monday. Join to documents and
    // filter out soft-deleted ones so we stay consistent with rollupPeriod —
    // otherwise we'd delete daily rows it didn't replace. The `date <` bound
    // is implied by the `date_trunc` filter but stated separately so the
    // planner can short-circuit via the (documentId, date, period) index
    // before evaluating the truncation.
    const weeks = await sequelize.query<{ weekStart: string }>(
      `
      SELECT DISTINCT date_trunc('week', di.date)::date AS "weekStart"
      FROM document_insights di
      INNER JOIN documents d
        ON d.id = di."documentId"
        AND d."deletedAt" IS NULL
      WHERE di.period = 'day'
        AND di."documentId" >= :startUuid::uuid
        AND di."documentId" <= :endUuid::uuid
        AND di.date < (NOW() AT TIME ZONE 'UTC')::date - (:cutoffDays::int * INTERVAL '1 day')
        AND date_trunc('week', di.date) < (NOW() AT TIME ZONE 'UTC')::date - ((:cutoffDays::int + 6) * INTERVAL '1 day')
      ORDER BY "weekStart" ASC
      `,
      {
        replacements: { startUuid, endUuid, cutoffDays: CUTOFF_DAYS },
        type: QueryTypes.SELECT,
      }
    );

    for (const { weekStart } of weeks) {
      const upserted = await DocumentInsight.rollupPeriod({
        periodStart: weekStart,
        intervalDays: 7,
        period: DocumentInsightPeriod.Week,
        startUuid,
        endUuid,
      });

      await sequelize.query(
        `
        DELETE FROM document_insights di
        USING documents d
        WHERE d.id = di."documentId"
          AND d."deletedAt" IS NULL
          AND di.period = 'day'
          AND di."documentId" >= :startUuid::uuid
          AND di."documentId" <= :endUuid::uuid
          AND di.date >= :weekStart::date
          AND di.date < :weekStart::date + INTERVAL '7 days'
        `,
        {
          replacements: { startUuid, endUuid, weekStart },
          type: QueryTypes.DELETE,
        }
      );

      Logger.info("task", `Rolled up document insights week ${weekStart}`, {
        upserted,
      });
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
