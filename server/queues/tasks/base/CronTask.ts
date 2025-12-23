import type { PartitionInfo } from "./BaseTask";
import { BaseTask } from "./BaseTask";

export enum TaskInterval {
  Day = "daily",
  Hour = "hourly",
}

export type TaskSchedule = {
  /** The interval at which to run this task */
  interval: TaskInterval;
  /**
   * An optional time window (in milliseconds) over which to spread the START time
   * of this task when triggered by cron.
   *
   * **Important**: This only delays when tasks START - it does NOT partition the work.
   * To distribute work across multiple workers, tasks must also use the `partition`
   * prop and implement partitioned queries using `getPartitionWhereClause()`.
   *
   * When set, each task gets a deterministic delay based on its name, ensuring
   * consistent scheduling across runs and preventing all tasks from starting
   * simultaneously.
   *
   * @example
   * // Run hourly, but spread task start times over 10 minutes
   * interval: TaskInterval.Hour,
   * partitionWindow: 10 * Minute.ms // 10 minutes
   *
   * @example
   * // Run daily, but spread task start times over 1 hour
   * interval: TaskInterval.Day,
   * partitionWindow: 60 * Minute.ms // 1 hour
   */
  partitionWindow?: number;
};

/**
 * Properties for cron-scheduled tasks.
 */
export type Props = {
  limit: number;
  partition: PartitionInfo;
};

export abstract class CronTask<P extends Props = Props> extends BaseTask<P> {
  /** The schedule configuration for this cron task */
  public abstract get cron(): TaskSchedule;
}
