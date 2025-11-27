import Router from "koa-router";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import validate from "@server/middlewares/validate";
import tasks from "@server/queues/tasks";
import { TaskSchedule } from "@server/queues/tasks/BaseTask";
import { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";
import * as T from "./schema";

const router = new Router();

/** Whether the minutely cron job has been received */
const receivedPeriods = new Set<TaskSchedule>();

const cronHandler = async (ctx: APIContext<T.CronSchemaReq>) => {
  const period = Object.values(TaskSchedule).includes(
    ctx.params.period as TaskSchedule
  )
    ? (ctx.params.period as TaskSchedule)
    : TaskSchedule.Day;
  const token = (ctx.input.body.token ?? ctx.input.query.token) as string;
  const limit = ctx.input.body.limit ?? ctx.input.query.limit;

  if (!safeEqual(env.UTILS_SECRET, token)) {
    throw AuthenticationError("Invalid secret token");
  }

  receivedPeriods.add(period);

  for (const name in tasks) {
    const TaskClass = tasks[name];
    const partitionWindow = TaskClass.cronPartitionWindow;
    const shouldSchedule =
      TaskClass.cron === period ||
      // Backwards compatibility for installations that have not set up
      // cron jobs periods other than daily.
      (TaskClass.cron === TaskSchedule.Minute &&
        !receivedPeriods.has(TaskSchedule.Minute) &&
        (period === TaskSchedule.Hour || period === TaskSchedule.Day)) ||
      (TaskClass.cron === TaskSchedule.Hour &&
        !receivedPeriods.has(TaskSchedule.Hour) &&
        period === TaskSchedule.Day);

    if (shouldSchedule) {
      if (partitionWindow && partitionWindow > 0) {
        // Split the task into partitions to spread work across time window
        // by diving the partitionWindow into minutes and scheduling a delayed
        // task for each minute.
        const partitions = Math.ceil(partitionWindow / 60000);
        for (let i = 0; i < partitions; i++) {
          const delay = Math.floor((partitionWindow / partitions) * i);
          const partition = {
            partitionIndex: i,
            partitionCount: partitions,
          };

          Logger.debug(
            "task",
            `Scheduling partitioned task ${name} (partition ${
              i + 1
            }/${partitions}) with delay of ${delay / 1000}s`
          );

          // @ts-expect-error We won't instantiate an abstract class
          await new TaskClass().schedule({ limit, partition }, { delay });
        }
      } else {
        // @ts-expect-error We won't instantiate an abstract class
        await new TaskClass().schedule({ limit });
      }
    }
  }

  ctx.body = {
    success: true,
  };
};
router.get("cron.:period", validate(T.CronSchema), cronHandler);
router.post("cron.:period", validate(T.CronSchema), cronHandler);

// For backwards compatibility
router.get("utils.gc", validate(T.CronSchema), cronHandler);
router.post("utils.gc", validate(T.CronSchema), cronHandler);

export default router;
