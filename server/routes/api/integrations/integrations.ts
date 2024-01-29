import Router from "koa-router";
import { WhereOptions } from "sequelize";
import { IntegrationType } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Event, IntegrationAuthentication } from "@server/models";
import Integration from "@server/models/Integration";
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

    const integrations = await Integration.findAll({
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: integrations.map(presentIntegration),
    };
  }
);

router.post(
  "integrations.create",
  auth({ admin: true }),
  validate(T.IntegrationsCreateSchema),
  async (ctx: APIContext<T.IntegrationsCreateReq>) => {
    const { type, service, settings } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createIntegration", user.team);

    const integration = await Integration.create({
      userId: user.id,
      teamId: user.teamId,
      service,
      settings,
      type,
    });

    ctx.body = {
      data: presentIntegration(integration),
    };
  }
);

router.post(
  "integrations.update",
  auth({ admin: true }),
  validate(T.IntegrationsUpdateSchema),
  async (ctx: APIContext<T.IntegrationsUpdateReq>) => {
    const { id, events, settings } = ctx.input.body;
    const { user } = ctx.state.auth;

    const integration = await Integration.findByPk(id);
    authorize(user, "update", integration);

    if (integration.type === IntegrationType.Post) {
      integration.events = events.filter((event: string) =>
        ["documents.update", "documents.publish"].includes(event)
      );
    }

    integration.settings = settings;

    await integration.save();

    ctx.body = {
      data: presentIntegration(integration),
    };
  }
);

router.post(
  "integrations.delete",
  auth({ admin: true }),
  validate(T.IntegrationsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.IntegrationsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const integration = await Integration.findByPk(id, { transaction });
    authorize(user, "delete", integration);

    await integration.destroy({ transaction });
    // also remove the corresponding authentication if it exists
    if (integration.authenticationId) {
      await IntegrationAuthentication.destroy({
        where: {
          id: integration.authenticationId,
        },
        transaction,
      });
    }

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
