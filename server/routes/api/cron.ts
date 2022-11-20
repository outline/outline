import crypto from "crypto";
import { Context } from "koa";
import Router from "koa-router";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import CleanupDeletedDocumentsTask from "@server/queues/tasks/CleanupDeletedDocumentsTask";
import CleanupDeletedTeamsTask from "@server/queues/tasks/CleanupDeletedTeamsTask";
import CleanupExpiredAttachmentsTask from "@server/queues/tasks/CleanupExpiredAttachmentsTask";
import CleanupExpiredFileOperationsTask from "@server/queues/tasks/CleanupExpiredFileOperationsTask";
import CleanupWebhookDeliveriesTask from "@server/queues/tasks/CleanupWebhookDeliveriesTask";
import InviteReminderTask from "@server/queues/tasks/InviteReminderTask";

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

  await CleanupDeletedDocumentsTask.schedule({ limit });

  await CleanupExpiredFileOperationsTask.schedule({ limit });

  await CleanupExpiredAttachmentsTask.schedule({ limit });

  await CleanupDeletedTeamsTask.schedule({ limit });

  await CleanupWebhookDeliveriesTask.schedule({ limit });

  await InviteReminderTask.schedule();

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
