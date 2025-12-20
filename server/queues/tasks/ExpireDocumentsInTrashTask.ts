import Logger from "@server/logging/Logger";
import { Team } from "@server/models";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import type { Props } from "./base/CronTask";
import ExpireDocumentsInTrashByRetentionTask from "./ExpireDocumentsInTrashByRetentionTask";

export default class ExpireDocumentsInTrashTask extends CronTask {
  /**
   * Identifies all unique trash retention periods and schedules a worker task for each.
   *
   * @param props Properties to be used by the task
   */
  public async perform(props: Props) {
    const defaultTrashRetentionDays = TeamPreferenceDefaults[
      TeamPreference.TrashRetentionDays
    ] as number;

    // Find all unique custom trash retention periods currently in use by teams.
    const customRetentionPeriods = await Team.findUniquePreferenceValues(
      TeamPreference.TrashRetentionDays
    );

    const task = new ExpireDocumentsInTrashByRetentionTask();

    // Schedule a task for each unique custom retention period.
    for (const days of customRetentionPeriods) {
      await task.schedule({
        retentionDays: days,
        partition: props.partition,
      });
    }

    // Schedule a task for the default retention period.
    await task.schedule({
      retentionDays: defaultTrashRetentionDays,
      partition: props.partition,
    });

    Logger.info(
      "task",
      `Scheduled ${customRetentionPeriods.length + 1} tranches for marking documents for permanent deletion`
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
