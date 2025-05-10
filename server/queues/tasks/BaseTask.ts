import { Job, JobOptions } from "bull";
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

export default abstract class BaseTask<T extends Record<string, any>> {
  /**
   * An optional schedule for this task to be run automatically.
   */
  static cron: TaskSchedule | undefined;

  /**
   * Schedule this task type to be processed asynchronously by a worker.
   *
   * @param props Properties to be used by the task
   * @returns A promise that resolves once the job is placed on the task queue
   */
  public static schedule<T>(props?: T, options?: JobOptions): Promise<Job> {
    // @ts-expect-error cannot create an instance of an abstract class, we wont
    const task = new this();

    return taskQueue.add(
      {
        name: this.name,
        props,
      },
      { ...options, ...task.options }
    );
  }

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
}
