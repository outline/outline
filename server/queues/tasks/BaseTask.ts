import { JobOptions } from "bull";
import { taskQueue } from "../";

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
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 60 * 1000,
      },
    };
  }
}
