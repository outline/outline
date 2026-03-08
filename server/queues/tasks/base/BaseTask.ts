import type { Job, JobOptions } from "bull";
import { Minute } from "@shared/utils/time";
import { taskQueue } from "../../";

export enum TaskPriority {
  Background = 40,
  Low = 30,
  Normal = 20,
  High = 10,
}

/**
 * Default timeout for tasks. Tasks that do not explicitly set a timeout will
 * use this value. This prevents hung tasks (e.g. waiting on a downed external
 * service) from blocking the worker indefinitely.
 */
const DEFAULT_TASK_TIMEOUT = 5 * Minute.ms;

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
      { timeout: DEFAULT_TASK_TIMEOUT, ...options, ...this.options }
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
      timeout: DEFAULT_TASK_TIMEOUT,
    };
  }
}
