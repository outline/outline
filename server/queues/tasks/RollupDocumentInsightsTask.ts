import { Day, Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { DocumentInsight } from "@server/models";
import { DocumentInsightPeriod } from "@server/models/DocumentInsight";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Number of recent days to (re)compute on each run, in addition to the current
 * day. Reprocessing the most recent days lets late-arriving writes (slow
 * workers, out-of-order event emission) settle into the rollup. The upsert is
 * idempotent.
 */
const RECOMPUTE_DAYS = 2;

export default class RollupDocumentInsightsTask extends CronTask {
  public async perform({ partition }: Props) {
    const [startUuid, endUuid] = this.getPartitionBounds(partition);

    for (let offset = RECOMPUTE_DAYS; offset >= 0; offset--) {
      const periodStart = new Date(Date.now() - offset * Day.ms)
        .toISOString()
        .slice(0, 10);

      const upserted = await DocumentInsight.rollupPeriod({
        periodStart,
        intervalDays: 1,
        period: DocumentInsightPeriod.Day,
        startUuid,
        endUuid,
      });

      Logger.info("task", `Rolled up document insights for ${periodStart}`, {
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
