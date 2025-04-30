import Router from "koa-router";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
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
  const period = Object.keys(TaskSchedule).includes(ctx.params.period)
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
    if (TaskClass.cron === period) {
      // @ts-expect-error We won't instantiate an abstract class
      await new TaskClass().schedule({ limit });

      // Backwards compatibility for installations that have not set up
      // cron jobs periods other than daily.
    } else if (
      TaskClass.cron === TaskSchedule.Minute &&
      !receivedPeriods.has(TaskSchedule.Minute) &&
      (period === TaskSchedule.Hour || period === TaskSchedule.Day)
    ) {
      // @ts-expect-error We won't instantiate an abstract class
      await new TaskClass().schedule({ limit });
    } else if (
      TaskClass.cron === TaskSchedule.Hour &&
      !receivedPeriods.has(TaskSchedule.Hour) &&
      period === TaskSchedule.Day
    ) {
      // @ts-expect-error We won't instantiate an abstract class
      await new TaskClass().schedule({ limit });
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
