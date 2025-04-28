import { JobOptions } from "bull";
import BaseTask from "./tasks/BaseTask";
import { taskQueue } from ".";

type TaskProps<T> = T extends BaseTask<infer U> ? U : never;

export class TaskScheduler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static schedule<T extends BaseTask<any>>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    task: new (...args: any) => T,
    props: TaskProps<T>,
    options?: JobOptions
  ) {
    const taskInstance = new task();

    return taskQueue.add(
      {
        name: task.name,
        props,
      },
      { ...options, ...taskInstance.options }
    );
  }
}
