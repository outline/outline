import type { WhereOptions } from "sequelize";
import { Op } from "sequelize";
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

/**
 * Properties for cron-scheduled tasks.
 */
export type Props = {
  limit: number;
  partition: PartitionInfo;
};

export abstract class CronTask extends BaseTask<Props> {
  /** The schedule configuration for this cron task */
  public abstract get cron(): TaskSchedule;

  /**
   * Optimized partitioning method for UUID primary keys using range-based distribution.
   * Divides the UUID space into N equal ranges and assigns each partition a range.
   *
   * The UUID space (0x00000000-... to 0xffffffff-...) is divided into N equal ranges.
   * For example, with 3 partitions:
   * - Partition 0: '00000000-0000-4000-8000-000000000000' to '55555554-ffff-4fff-bfff-ffffffffffff'
   * - Partition 1: '55555555-0000-4000-8000-000000000000' to 'aaaaaaaa-ffff-4fff-bfff-ffffffffffff'
   * - Partition 2: 'aaaaaaab-0000-4000-8000-000000000000' to 'ffffffff-ffff-4fff-bfff-ffffffffffff'
   *
   * @param partitionInfo The partition information
   * @returns The start and end UUID bounds for the partition
   */
  protected getPartitionBounds(
    partitionInfo: PartitionInfo | undefined
  ): [string, string] {
    if (!partitionInfo) {
      return [
        "00000000-0000-4000-8000-000000000000",
        "ffffffff-ffff-4fff-bfff-ffffffffffff",
      ];
    }

    const { partitionIndex, partitionCount } = partitionInfo;

    if (
      partitionCount <= 0 ||
      partitionIndex < 0 ||
      partitionIndex >= partitionCount
    ) {
      throw new Error(
        `Invalid partition info: index ${partitionIndex}, count ${partitionCount}`
      );
    }

    // 2^32 total possible values for the first 32 bits (4.3 billion)
    const TOTAL_VALUES = 0x100000000;

    // The maximum possible integer value (0xFFFFFFFF)
    const MAX_VALUE = TOTAL_VALUES - 1;

    // Ensure even distribution of values by calculating exact range size
    const rangeSize = Math.floor(TOTAL_VALUES / partitionCount);
    const rangeStart = partitionIndex * rangeSize;

    let rangeEnd: number;
    if (partitionIndex === partitionCount - 1) {
      // The last partition takes any remainder and goes up to the max value
      rangeEnd = MAX_VALUE;
    } else {
      // The end is the start of the *next* partition minus 1
      rangeEnd = (partitionIndex + 1) * rangeSize - 1;
    }

    // Use Number.prototype.toString(16) and padStart(8, '0') for the 32-bit hex prefix
    const startHex = rangeStart.toString(16).padStart(8, "0");
    const endHex = rangeEnd.toString(16).padStart(8, "0");

    // Start: First 32 bits (prefix) followed by the lowest possible values for the rest
    // Ensures correct UUID v4 version (4xxx) and variant (8|9|a|bxxx) bits
    const startUuid = `${startHex}-0000-4000-8000-000000000000`;

    // End: First 32 bits (prefix) followed by the highest possible values for the rest
    // Ensures correct UUID v4 version (4xxx) and variant (8|9|a|bxxx) bits
    const endUuid = `${endHex}-ffff-4fff-bfff-ffffffffffff`;

    return [startUuid, endUuid];
  }

  /**
   * Optimized partitioning method for UUID primary keys using range-based distribution.
   * Divides the UUID space into N equal ranges and assigns each partition a range.
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

    const [startUuid, endUuid] = this.getPartitionBounds(partitionInfo);

    return {
      [idField]: {
        [Op.gte]: startUuid,
        [Op.lte]: endUuid,
      },
    };
  }
}
