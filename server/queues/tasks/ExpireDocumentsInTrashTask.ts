import Logger from "@server/logging/Logger";
import { Team } from "@server/models";
import { TeamPreference } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import type { Props } from "./base/CronTask";
import ExpireDocumentsInTrashByRetentionTask from "./ExpireDocumentsInTrashByRetentionTask";

export default class ExpireDocumentsInTrashTask extends CronTask {
  /**
   * Schedules a worker task for each trash retention period in use.
   *
   * @param props Properties to be used by the task.
   */
  public async perform(props: Props) {
    const task = new ExpireDocumentsInTrashByRetentionTask();
    const retentionPeriods = await Team.getRetentionPeriodsInUse(
      TeamPreference.TrashRetentionDays
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
      `Scheduled ${retentionPeriods.length} tranches for expiring documents from trash`
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
