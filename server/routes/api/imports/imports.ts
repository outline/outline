import Router from "koa-router";
import truncate from "lodash/truncate";
import { WhereOptions } from "sequelize";
import { ImportState, IntegrationType, UserRole } from "@shared/types";
import { ImportValidation } from "@shared/validations";
import { UnprocessableEntityError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Integration } from "@server/models";
import Import from "@server/models/Import";
import { authorize } from "@server/policies";
import { presentImport, presentPolicies } from "@server/presenters";
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
    const { integrationId, service, input } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createImport", user.team);

    const importInProgress = await Import.count({
      where: {
        state: [
          ImportState.Created,
          ImportState.InProgress,
          ImportState.Processed,
        ],
        teamId: user.teamId,
      },
    });

    if (importInProgress) {
      throw UnprocessableEntityError("An import is already in progress");
    }

    const integration = await Integration.findByPk<
      Integration<IntegrationType.Import>
    >(integrationId, {
      rejectOnEmpty: true,
    });
    authorize(user, "read", integration);

    const name = integration.settings.externalWorkspace.name;

    const importModel = await Import.createWithCtx(ctx, {
      name: truncate(name, { length: ImportValidation.maxNameLength }),
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
      policies: presentPolicies(user, [importModel]),
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

    authorize(user, "listImports", user.team);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: WhereOptions<Import<any>> = { teamId: user.teamId };

    if (service) {
      where.service = service;
    }

    const [imports, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Import.findAll<Import<any>>({
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
      policies: presentPolicies(user, imports),
    };
  }
);

router.post(
  "imports.info",
  auth({ role: UserRole.Admin }),
  validate(T.ImportsInfoSchema),
  async (ctx: APIContext<T.ImportsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const importModel = await Import.findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "read", importModel);

    ctx.body = {
      data: presentImport(importModel),
      policies: presentPolicies(user, [importModel]),
    };
  }
);

router.post(
  "imports.delete",
  auth({ role: UserRole.Admin }),
  validate(T.ImportsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.ImportsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const importModel = await Import.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", importModel);

    await importModel.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "imports.cancel",
  auth({ role: UserRole.Admin }),
  validate(T.ImportsCancelSchema),
  transaction(),
  async (ctx: APIContext<T.ImportsCancelReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    let importModel = await Import.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "cancel", importModel);

    importModel.state = ImportState.Canceled;
    importModel = await importModel.saveWithCtx(ctx);

    ctx.body = {
      data: presentImport(importModel),
      policies: presentPolicies(user, [importModel]),
    };
  }
);

export default router;
