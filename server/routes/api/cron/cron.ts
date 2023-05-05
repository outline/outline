import Router from "koa-router";
import validate from "@server/middlewares/validate";
import tasks from "@server/queues/tasks";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

const cronHandler = async (ctx: APIContext<T.CronSchemaReq>) => {
  const limit = ctx.input.body.limit ?? ctx.input.query.limit;

  for (const name in tasks) {
    const TaskClass = tasks[name];
    if (TaskClass.cron) {
      await TaskClass.schedule({ limit });
    }
  }

  ctx.body = {
    success: true,
  };
};

router.get("cron.:period", validate(T.CronSchema), cronHandler);
router.post("cron.:period", validate(T.CronSchema), cronHandler);

// For backwards compatibility
router.get("utils.gc", cronHandler);
router.post("utils.gc", cronHandler);

export default router;
