import Logger from "@server/logging/Logger";
import { getRetentionPeriodsInUse } from "@server/utils/retention";
import { TeamPreference } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import type { Props } from "./base/CronTask";
import CleanupPermanentlyDeletedDocumentsByRetentionTask from "./CleanupPermanentlyDeletedDocumentsByRetentionTask";

export default class CleanupPermanentlyDeletedDocumentsTask extends CronTask {
  /**
   * Schedules a worker task for each data retention period in use.
   *
   * @param props Properties to be used by the task.
   */
  public async perform(props: Props) {
    const task = new CleanupPermanentlyDeletedDocumentsByRetentionTask();
    const retentionPeriods = await getRetentionPeriodsInUse(
      TeamPreference.DataRetentionDays
    );

    for (const retentionDays of retentionPeriods) {
      await task.schedule({
        limit: props.limit,
        retentionDays,
        partition: props.partition,
      });
    }

    Logger.debug(
      "task",
      `Scheduled ${retentionPeriods.length} tranches for document cleanup`
    );
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
