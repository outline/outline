import { Day, Hour, Second } from "@shared/utils/time";
import tasks from "@server/queues/tasks";
import { TaskSchedule } from "@server/queues/tasks/BaseTask";

export default function init() {
  async function run(schedule: TaskSchedule) {
    for (const name in tasks) {
      const TaskClass = tasks[name];
      if (TaskClass.cron === schedule) {
        await TaskClass.schedule({ limit: 10000 });
      }
    }
  }

  setInterval(() => void run(TaskSchedule.Daily), Day);
  setInterval(() => void run(TaskSchedule.Hourly), Hour);

  // Just give everything time to startup before running the first time. Not
  // _technically_ required to function.
  setTimeout(() => {
    void run(TaskSchedule.Daily);
    void run(TaskSchedule.Hourly);
  }, 30 * Second);
}
