import { Day, Hour, Second } from "@shared/utils/time";
import tasks from "@server/queues/tasks";
import { CronTask, TaskInterval } from "@server/queues/tasks/base/CronTask";

export default function init() {
  async function run(schedule: TaskInterval) {
    const partition = {
      partitionIndex: 0,
      partitionCount: 1,
    };

    for (const name in tasks) {
      const TaskClass = tasks[name];
      if (!(TaskClass.prototype instanceof CronTask)) {
        continue;
      }

      // @ts-expect-error We won't instantiate an abstract class
      const taskInstance = new TaskClass() as CronTask;

      if (taskInstance.cron.interval === schedule) {
        await taskInstance.schedule({ limit: 10000, partition });
      }
    }
  }

  setInterval(() => void run(TaskInterval.Day), Day.ms);
  setInterval(() => void run(TaskInterval.Hour), Hour.ms);

  // Just give everything time to startup before running the first time. Not
  // _technically_ required to function.
  setTimeout(() => {
    void run(TaskInterval.Day);
    void run(TaskInterval.Hour);
  }, 5 * Second.ms);
}
