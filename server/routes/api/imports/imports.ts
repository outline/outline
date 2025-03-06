import Router from "koa-router";
import { ImportState, UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
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
  async (ctx: APIContext<T.ImportsCreateReq>) => {
    const { integrationId, service, data } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createImport", user.team);

    await Import.create({
      service,
      state: ImportState.Created,
      data,
      createdById: user.id,
      integrationId,
    });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
