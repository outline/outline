import Router from "koa-router";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { View, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentView } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";
import { transaction } from "@server/middlewares/transaction";

const router = new Router();

router.post(
  "views.list",
  auth(),
  validate(T.ViewsListSchema),
  async (ctx: APIContext<T.ViewsListReq>) => {
    const { documentId, includeSuspended } = ctx.input.body;
    const { user } = ctx.state.auth;

    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });
    authorize(user, "listViews", document);

    if (!document.insightsEnabled) {
      throw ValidationError("Insights are not enabled for this document");
    }

    const views = await View.findByDocument(documentId, { includeSuspended });

    ctx.body = {
      data: views.map(presentView),
    };
  }
);

router.post(
  "views.create",
  rateLimiter(RateLimiterStrategy.OneThousandPerHour),
  auth(),
  validate(T.ViewsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.ViewsCreateReq>) => {
    const { documentId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });
    authorize(user, "read", document);

    const view = await View.incrementOrCreate(ctx, {
      documentId,
      userId: user.id,
    });

    view.user = user;

    ctx.body = {
      data: presentView(view),
    };
  }
);

export default router;
