import type { Job, JobOptions } from "bull";
import { taskQueue } from "../../";
import type { WhereOptions } from "sequelize";
import { Op } from "sequelize";

export enum TaskPriority {
  Background = 40,
  Low = 30,
  Normal = 20,
  High = 10,
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

export abstract class BaseTask<T extends Record<string, any>> {
  /**
   * Schedule this task type to be processed asynchronously by a worker.
   *
   * @param props Properties to be used by the task
   * @param options Job options such as priority and retry strategy, as defined by Bull.
   * @returns A promise that resolves once the job is placed on the task queue
   */
  public schedule(props: T, options?: JobOptions): Promise<Job> {
    return taskQueue().add(
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
   * Job options such as priority and retry strategy.
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
