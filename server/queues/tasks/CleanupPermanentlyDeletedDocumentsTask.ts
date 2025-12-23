import Logger from "@server/logging/Logger";
import { Team } from "@server/models";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import type { Props } from "./base/CronTask";
import CleanupPermanentlyDeletedDocumentsByRetentionTask from "./CleanupPermanentlyDeletedDocumentsByRetentionTask";

export default class CleanupPermanentlyDeletedDocumentsTask extends CronTask {
  /**
   * Identifies all unique retention periods and schedules a worker task for each.
   *
   * @param props Properties to be used by the task
   */
  public async perform(props: Props) {
    const defaultRetentionDays = TeamPreferenceDefaults[
      TeamPreference.DataRetentionDays
    ] as number;

    // Find all unique custom retention periods currently in use by teams.
    const customRetentionPeriods = await Team.findUniquePreferenceValues(
      TeamPreference.DataRetentionDays
    );

    const task = new CleanupPermanentlyDeletedDocumentsByRetentionTask();

    // Schedule a task for each unique custom retention period.
    for (const days of customRetentionPeriods) {
      await task.schedule({
        limit: props.limit,
        retentionDays: days,
        partition: props.partition,
      });
    }

    // Schedule a task for the default retention period.
    await task.schedule({
      limit: props.limit,
      retentionDays: defaultRetentionDays,
      partition: props.partition,
    });

    Logger.debug(
      "task",
      `Scheduled ${customRetentionPeriods.length + 1} tranches for document cleanup`
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
