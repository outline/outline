import { Context } from "koa";
import Router from "koa-router";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import CleanupDeletedDocumentsTask from "@server/queues/tasks/CleanupDeletedDocumentsTask";
import CleanupDeletedTeamsTask from "@server/queues/tasks/CleanupDeletedTeamsTask";
import CleanupExpiredFileOperationsTask from "@server/queues/tasks/CleanupExpiredFileOperationsTask";
import InviteReminderTask from "@server/queues/tasks/InviteReminderTask";

const router = new Router();

const cronHandler = async (ctx: Context) => {
  const { token, limit = 500 } = ctx.body as { token?: string; limit: number };

  if (env.UTILS_SECRET !== token) {
    throw AuthenticationError("Invalid secret token");
  }

  await CleanupDeletedDocumentsTask.schedule({ limit });

  await CleanupExpiredFileOperationsTask.schedule({ limit });

  await CleanupDeletedTeamsTask.schedule({ limit });

  await InviteReminderTask.schedule();

  ctx.body = {
    success: true,
  };
};

router.post("cron.:period", cronHandler);

// For backwards compatibility
router.post("utils.gc", cronHandler);

export default router;
