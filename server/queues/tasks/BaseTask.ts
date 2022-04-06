import { JobOptions } from "bull";
import { taskQueue } from "../";

export enum TaskPriority {
  Background = 40,
  Low = 30,
  Normal = 20,
  High = 10,
}

export default abstract class BaseTask<T> {
  public static schedule<T>(props: T) {
    // @ts-expect-error cannot create an instance of an abstract class, we wont
    const task = new this();
    return taskQueue.add(
      {
        name: this.name,
        props,
      },
      task.options
    );
  }

  public abstract perform(props: T): Promise<void>;

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
