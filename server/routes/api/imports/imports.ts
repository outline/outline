import Router from "koa-router";
import { WhereOptions } from "sequelize";
import { ImportState, UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import Import from "@server/models/Import";
import { authorize } from "@server/policies";
import { presentImport } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "imports.create",
  auth({ role: UserRole.Admin }),
  validate(T.ImportsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.ImportsCreateReq>) => {
    const { name, integrationId, service, input } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createImport", user.team);

    const importModel = await Import.createWithCtx(ctx, {
      name,
      service,
      state: ImportState.Created,
      input,
      integrationId,
      createdById: user.id,
      teamId: user.teamId,
    });
    importModel.createdBy = user;

    ctx.body = {
      data: presentImport(importModel),
    };
  }
);

router.post(
  "imports.list",
  auth({ role: UserRole.Admin }),
  pagination(),
  validate(T.ImportsListSchema),
  async (ctx: APIContext<T.ImportsListReq>) => {
    const { service, sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: WhereOptions<Import<any>> = service
      ? {
          service,
        }
      : {};

    const [imports, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Import.scope("withUser").findAll<Import<any>>({
        where,
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Import.count<Import<any>>({
        where,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: imports.map(presentImport),
    };
  }
);

export default router;
