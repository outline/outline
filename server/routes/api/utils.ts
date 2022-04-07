import Router from "koa-router";
import { AuthenticationError } from "@server/errors";
import CleanupDeletedDocumentsTask from "@server/queues/tasks/CleanupDeletedDocumentsTask";
import CleanupDeletedTeamsTask from "@server/queues/tasks/CleanupDeletedTeamsTask";
import CleanupExpiredFileOperationsTask from "@server/queues/tasks/CleanupExpiredFileOperationsTask";

const router = new Router();

router.post("utils.gc", async (ctx) => {
  const { token, limit = 500 } = ctx.body;

  if (process.env.UTILS_SECRET !== token) {
    throw AuthenticationError("Invalid secret token");
  }

  await CleanupDeletedDocumentsTask.schedule({ limit });

  await CleanupExpiredFileOperationsTask.schedule({ limit });

  await CleanupDeletedTeamsTask.schedule({ limit });

  ctx.body = {
    success: true,
  };
});

export default router;
