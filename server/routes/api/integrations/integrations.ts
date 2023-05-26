import Router from "koa-router";
import { WhereOptions } from "sequelize";
import integrationCreator from "@server/commands/integrationCreator";
import integrationUpdater from "@server/commands/integrationUpdater";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Event, Integration } from "@server/models";
import { authorize } from "@server/policies";
import { presentIntegration } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "integrations.list",
  auth(),
  pagination(),
  validate(T.IntegrationsListSchema),
  async (ctx: APIContext<T.IntegrationsListReq>) => {
    const { direction, type, sort } = ctx.input.body;
    const { user } = ctx.state.auth;

    let where: WhereOptions<Integration> = {
      teamId: user.teamId,
    };

    if (type) {
      where = {
        ...where,
        type,
      };
    }

    const integrations = await Integration.scope([
      "withAuthentication",
    ]).findAll({
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: integrations.map((integration) =>
        presentIntegration(integration, { includeToken: user.isAdmin })
      ),
    };
  }
);

router.post(
  "integrations.create",
  transaction(),
  auth({ admin: true }),
  validate(T.IntegrationsCreateSchema),
  async (ctx: APIContext<T.IntegrationsCreateReq>) => {
    const { type, service, settings, authToken: token } = ctx.input.body;
    const { transaction } = ctx.state;
    const { user } = ctx.state.auth;

    authorize(user, "createIntegration", user.team);

    const integration = await integrationCreator({
      user,
      type,
      service,
      settings,
      token,
      transaction,
    });

    ctx.body = {
      data: presentIntegration(integration, {
        includeToken: user.isAdmin,
      }),
    };
  }
);

router.post(
  "integrations.update",
  transaction(),
  auth({ admin: true }),
  validate(T.IntegrationsUpdateSchema),
  async (ctx: APIContext<T.IntegrationsUpdateReq>) => {
    const { id, events, settings, authToken: token } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    let integration = await Integration.findByPk(id, { transaction });
    authorize(user, "update", integration);

    integration = await integrationUpdater({
      integration,
      events,
      settings,
      token,
      transaction,
    });

    ctx.body = {
      data: presentIntegration(integration, { includeToken: user.isAdmin }),
    };
  }
);

router.post(
  "integrations.delete",
  auth({ admin: true }),
  transaction(),
  validate(T.IntegrationsDeleteSchema),
  async (ctx: APIContext<T.IntegrationsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const integration = await Integration.findByPk(id, { transaction });
    authorize(user, "delete", integration);

    await integration.destroy({ transaction });
    await Event.create(
      {
        name: "integrations.delete",
        modelId: integration.id,
        teamId: integration.teamId,
        actorId: user.id,
        ip: ctx.request.ip,
      },
      { transaction }
    );

    ctx.body = {
      success: true,
    };
  }
);

export default router;
