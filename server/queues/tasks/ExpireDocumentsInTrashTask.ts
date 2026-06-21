import Logger from "@server/logging/Logger";
import { RetentionPeriodPresets } from "@shared/constants";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import type { Props } from "./base/CronTask";
import ExpireDocumentsInTrashByRetentionTask from "./ExpireDocumentsInTrashByRetentionTask";

export default class ExpireDocumentsInTrashTask extends CronTask {
  /**
   * Schedules a worker task for each retention period preset.
   *
   * @param props Properties to be used by the task.
   */
  public async perform(props: Props) {
    const task = new ExpireDocumentsInTrashByRetentionTask();

    for (const days of RetentionPeriodPresets) {
      if (days === 0) {
        continue;
      }
      await task.schedule({
        retentionDays: days,
        partition: props.partition,
      });
    }

    Logger.debug(
      "task",
      `Scheduled ${RetentionPeriodPresets.length - 1} tranches for marking documents for permanent deletion`
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
