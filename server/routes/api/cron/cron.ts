import crypto from "crypto";
import Router from "koa-router";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import validate from "@server/middlewares/validate";
import tasks from "@server/queues/tasks";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

const cronHandler = async (ctx: APIContext<T.CronSchemaReq>) => {
  const token = (ctx.input.body.token ?? ctx.input.query.token) as string;
  const limit = ctx.input.body.limit ?? ctx.input.query.limit;

  if (
    token.length !== env.UTILS_SECRET.length ||
    !crypto.timingSafeEqual(
      Buffer.from(env.UTILS_SECRET),
      Buffer.from(String(token))
    )
  ) {
    throw AuthenticationError("Invalid secret token");
  }

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
router.get("utils.gc", validate(T.CronSchema), cronHandler);
router.post("utils.gc", validate(T.CronSchema), cronHandler);

export default router;
