import { Job, JobOptions } from "bull";
import { Op, WhereOptions } from "sequelize";
import { sequelize } from "@server/storage/database";
import { taskQueue } from "../";

export enum TaskPriority {
  Background = 40,
  Low = 30,
  Normal = 20,
  High = 10,
}

export enum TaskSchedule {
  Day = "daily",
  Hour = "hourly",
  Minute = "minute",
}

/**
 * Partition information for distributing work across multiple worker instances.
 */
export type PartitionInfo = {
  /**
   * The partition number for this task instance (0-based).
   */
  partitionIndex: number;
  /**
   * The total number of partitions.
   */
  partitionCount: number;
};

export default abstract class BaseTask<T extends Record<string, any>> {
  /**
   * An optional schedule for this task to be run automatically.
   */
  static cron: TaskSchedule | undefined;

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
   * static cron = TaskSchedule.Hour;
   * static cronPartitionWindow = 10 * 60 * 1000; // 10 minutes
   *
   * @example
   * // Run daily, but spread task start times over 1 hour
   * static cron = TaskSchedule.Day;
   * static cronPartitionWindow = 60 * 60 * 1000; // 1 hour
   */
  static cronPartitionWindow: number | undefined;

  /**
   * Schedule this task type to be processed asynchronously by a worker.
   *
   * @param props Properties to be used by the task
   * @param options Job options such as priority and retry strategy, as defined by Bull.
   * @returns A promise that resolves once the job is placed on the task queue
   */
  public schedule(props: T, options?: JobOptions): Promise<Job> {
    return taskQueue.add(
      {
        name: this.constructor.name,
        props,
      },
      { ...options, ...this.options }
    );
  }

  /**
   * Execute the task.
   *
   * @param props Properties to be used by the task
   * @returns A promise that resolves once the task has completed.
   */
  public abstract perform(props: T): Promise<any>;

  /**
   * Handle failure when all attempts are exhausted for the task.
   *
   * @param props Properties to be used by the task
   * @returns A promise that resolves once the task handles the failure.
   */
  // oxlint-disable-next-line @typescript-eslint/no-unused-vars
  public onFailed(props: T): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Job options such as priority and retry strategy, as defined by Bull.
   */
  public get options(): JobOptions {
    return {
      priority: TaskPriority.Normal,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 60 * 1000,
      },
    };
  }

  /**
   * Optimized partitioning method for UUID primary keys using range-based distribution.
   * Divides the UUID space into N equal ranges and assigns each partition a range.
   *
   * The UUID space (0x00000000-... to 0xffffffff-...) is divided into N equal ranges.
   * For example, with 3 partitions:
   * - Partition 0: '00000000-0000-...' to '55555554-ffff-...'
   * - Partition 1: '55555555-0000-...' to 'aaaaaaaa-ffff-...'
   * - Partition 2: 'aaaaaaab-0000-...' to 'ffffffff-ffff-...'
   *
   * This provides even distribution and excellent query performance.
   *
   * @param idField The name of the UUID primary key field to partition on
   * @param partitionInfo The partition information
   * @returns A WHERE clause for partitioned queries
   *
   * @example
   * const where = {
   *   deletedAt: { [Op.lt]: someDate },
   *   ...this.getPartitionWhereClause("id", props.partition)
   * };
   */
  protected getPartitionWhereClause(
    idField: string,
    partitionInfo: PartitionInfo | undefined
  ): WhereOptions {
    if (!partitionInfo) {
      return {};
    }

    const { partitionIndex, partitionCount } = partitionInfo;

    // Validate partition info
    if (
      partitionCount <= 0 ||
      partitionIndex < 0 ||
      partitionIndex >= partitionCount
    ) {
      throw new Error(
        `Invalid partition info: index ${partitionIndex}, count ${partitionCount}`
      );
    }

    // Calculate UUID range boundaries for this partition
    // We use the first 32 bits (8 hex chars) of the UUID to divide the space
    // This gives us 4.3 billion possible values, more than enough for even distribution
    const maxValue = 0xffffffff; // 2^32 - 1
    const totalValues = 0x100000000; // 2^32 total possible values (including 0)

    // Calculate exact boundaries to ensure even distribution
    // Each partition gets floor(totalValues/partitionCount) values,
    // with the last partition getting any remainder
    const rangeSize = Math.floor(totalValues / partitionCount);
    const rangeStart = partitionIndex * rangeSize;

    // For the end value, we need the start of the next partition minus 1
    // except for the last partition which goes to maxValue
    const rangeEnd =
      partitionIndex === partitionCount - 1
        ? maxValue // Last partition includes the max value
        : (partitionIndex + 1) * rangeSize - 1;

    // Convert to 8-character hex strings (padded with leading zeros)
    const startHex = rangeStart.toString(16).padStart(8, "0");
    const endHex = rangeEnd.toString(16).padStart(8, "0");

    // Create UUID boundaries
    // Start: lowest possible UUID with this prefix
    // End: highest possible UUID with this prefix
    const startUuid = `${startHex}-0000-0000-0000-000000000000`;
    const endUuid = `${endHex}-ffff-ffff-ffff-ffffffffffff`;

    // Return range query
    return {
      [idField]: {
        [Op.gte]: startUuid,
        [Op.lte]: endUuid,
      },
    };
  }
}
