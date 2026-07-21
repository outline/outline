import type { Job, JobsOptions } from "bullmq";
import { taskQueue, taskQueueEvents } from "../../";

export enum TaskPriority {
  Background = 40,
  Low = 30,
  Normal = 20,
  High = 10,
}

export abstract class BaseTask<T extends object> {
  /**
   * Schedule this task type to be processed asynchronously by a worker.
   *
   * @param props Properties to be used by the task
   * @param options Job options such as priority and retry strategy, as defined by BullMQ.
   * @returns A promise that resolves once the job is placed on the task queue
   */
  public schedule(props: T, options?: JobsOptions): Promise<Job> {
    return taskQueue().add(
      this.constructor.name,
      { props },
      { ...options, ...this.options }
    );
  }

  /**
   * Schedule this task to be processed by a worker and wait for the result.
   *
   * @param props Properties to be used by the task
   * @param options Job options such as priority and retry strategy, as defined by BullMQ.
   * @returns A promise that resolves to the return value of `perform`.
   */
  public async scheduleAndWait(
    props: T,
    options?: JobsOptions
  ): Promise<Awaited<ReturnType<this["perform"]>>> {
    // The events listener must be connected before the job is added, so that
    // the completion event cannot be missed.
    const queueEvents = await taskQueueEvents();
    const job = await this.schedule(props, options);
    return job.waitUntilFinished(queueEvents);
  }

  /**
   * Execute the task.
   *
   * @param props Properties to be used by the task
   * @returns A promise that resolves once the task has completed.
   */
  public abstract perform(props: T): Promise<unknown>;

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
  public get options(): JobsOptions {
    return {
      priority: TaskPriority.Normal,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 60 * 1000,
      },
    };
  }
}
