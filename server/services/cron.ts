import { Day, Hour, Minute, Second } from "@shared/utils/time";
import tasks from "@server/queues/tasks";
import { TaskSchedule } from "@server/queues/tasks/BaseTask";

export default function init() {
  async function run(schedule: TaskSchedule) {
    for (const name in tasks) {
      const TaskClass = tasks[name];
      if (TaskClass.cron === schedule) {
        // @ts-expect-error We won't instantiate an abstract class
        await new TaskClass().schedule({ limit: 10000 });
      }
    }
  }

  setInterval(() => void run(TaskSchedule.Day), Day.ms);
  setInterval(() => void run(TaskSchedule.Hour), Hour.ms);
  setInterval(() => void run(TaskSchedule.Minute), Minute.ms);

  // Just give everything time to startup before running the first time. Not
  // _technically_ required to function.
  setTimeout(() => {
    void run(TaskSchedule.Day);
    void run(TaskSchedule.Hour);
    void run(TaskSchedule.Minute);
  }, 5 * Second.ms);
}
