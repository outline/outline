import Logger from "@server/logging/Logger";
import { RetentionPeriodPresets } from "@shared/constants";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import type { Props } from "./base/CronTask";
import CleanupPermanentlyDeletedDocumentsByRetentionTask from "./CleanupPermanentlyDeletedDocumentsByRetentionTask";

export default class CleanupPermanentlyDeletedDocumentsTask extends CronTask {
  /**
   * Schedules a worker task for each retention period preset.
   *
   * @param props Properties to be used by the task.
   */
  public async perform(props: Props) {
    const task = new CleanupPermanentlyDeletedDocumentsByRetentionTask();

    for (const days of RetentionPeriodPresets) {
      if (days === 0) {
        continue;
      }
      await task.schedule({
        limit: props.limit,
        retentionDays: days,
        partition: props.partition,
      });
    }

    Logger.debug(
      "task",
      `Scheduled ${RetentionPeriodPresets.length - 1} tranches for document cleanup`
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
