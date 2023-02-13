import crypto from "crypto";
import { Context } from "koa";
import Router from "koa-router";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import tasks from "@server/queues/tasks";

const router = new Router();

const cronHandler = async (ctx: Context) => {
  const { token, limit = 500 } = (ctx.method === "POST"
    ? ctx.request.body
    : ctx.request.query) as {
    token?: string;
    limit: number;
  };

  if (!token || typeof token !== "string") {
    throw AuthenticationError("Token is required");
  }

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

router.get("cron.:period", cronHandler);
router.post("cron.:period", cronHandler);

// For backwards compatibility
router.get("utils.gc", cronHandler);
router.post("utils.gc", cronHandler);

export default router;
