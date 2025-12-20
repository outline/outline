import Router from "koa-router";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import validate from "@server/middlewares/validate";
import tasks from "@server/queues/tasks";
import { CronTask, TaskInterval } from "@server/queues/tasks/base/CronTask";
import type { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";
import * as T from "./schema";
import { Minute } from "@shared/utils/time";

const router = new Router();
const receivedPeriods = new Set<TaskInterval>();

const cronHandler = async (ctx: APIContext<T.CronSchemaReq>) => {
  const period = Object.values(TaskInterval).includes(
    ctx.params.period as TaskInterval
  )
    ? (ctx.params.period as TaskInterval)
    : TaskInterval.Day;
  const token = (ctx.input.body.token ?? ctx.input.query.token) as string;
  const limit = ctx.input.body.limit ?? ctx.input.query.limit;

  if (!safeEqual(env.UTILS_SECRET, token)) {
    throw AuthenticationError("Invalid secret token");
  }

  receivedPeriods.add(period);

  for (const name in tasks) {
    const TaskClass = tasks[name];
    if (!(TaskClass.prototype instanceof CronTask)) {
      continue;
    }

    // @ts-expect-error We won't instantiate an abstract class
    const taskInstance = new TaskClass() as CronTask;

    const cronConfig = taskInstance.cron;
    const partitionWindow = cronConfig.partitionWindow;
    const shouldSchedule =
      cronConfig.interval === period ||
      // Backwards compatibility for installations that have not set up
      // cron jobs periods other than daily.
      (cronConfig.interval === TaskInterval.Hour &&
        !receivedPeriods.has(TaskInterval.Hour) &&
        period === TaskInterval.Day);

    if (shouldSchedule) {
      if (partitionWindow && partitionWindow > 0) {
        // Split the task into partitions to spread work across time window
        // by dividing the partitionWindow into minutes and scheduling a delayed
        // task for each minute.
        const partitions = Math.ceil(partitionWindow / Minute.ms);
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

          await taskInstance.schedule({ limit, partition }, { delay });
        }
      } else {
        await taskInstance.schedule({
          limit,
          partition: {
            partitionIndex: 0,
            partitionCount: 1,
          },
        });
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
