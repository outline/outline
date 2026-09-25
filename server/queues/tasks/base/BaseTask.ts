import type { Job, JobOptions } from "bull";
import { taskQueue } from "../../";

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
   * @param options Job options such as priority and retry strategy, as defined by Bull.
   * @returns A promise that resolves once the job is placed on the task queue
   */
  public schedule(props: T, options?: JobOptions): Promise<Job> {
    const jobId = this.jobId(props) ?? options?.jobId;
    return taskQueue().add(
      {
        name: this.constructor.name,
        props,
      },
      { ...options, jobId, ...this.options }
    );
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
   * A stable ID for the job. When defined, a job with the same ID that is
   * already queued or active prevents a duplicate from being added.
   *
   * @param props Properties to be used by the task
   * @returns The job ID, or undefined to let the queue assign one.
   */
  // oxlint-disable-next-line @typescript-eslint/no-unused-vars
  protected jobId(props: T): string | undefined {
    return undefined;
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
}
