import Router from "koa-router";
import { ImportState, UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import Import from "@server/models/Import";
import { authorize } from "@server/policies";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

router.post(
  "imports.create",
  auth({ role: UserRole.Admin }),
  validate(T.ImportsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.ImportsCreateReq>) => {
    const { integrationId, service, input } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createImport", user.team);

    await Import.createWithCtx(ctx, {
      service,
      state: ImportState.Created,
      input,
      createdById: user.id,
      integrationId,
    });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
