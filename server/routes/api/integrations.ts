import Router from "koa-router";
import { has } from "lodash";
import { WhereOptions } from "sequelize";
import { IntegrationType } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { Event } from "@server/models";
import Integration, {
  UserCreatableIntegrationService,
} from "@server/models/Integration";
import { authorize } from "@server/policies";
import { presentIntegration } from "@server/presenters";
import { APIContext } from "@server/types";
import {
  assertSort,
  assertUuid,
  assertArray,
  assertIn,
  assertUrl,
} from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post(
  "integrations.list",
  auth(),
  pagination(),
  async (ctx: APIContext) => {
    let { direction } = ctx.request.body;
    const { user } = ctx.state.auth;
    const { type, sort = "updatedAt" } = ctx.request.body;
    if (direction !== "ASC") {
      direction = "DESC";
    }
    assertSort(sort, Integration);

    let where: WhereOptions<Integration> = {
      teamId: user.teamId,
    };

    if (type) {
      assertIn(type, Object.values(IntegrationType));
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
  async (ctx: APIContext) => {
    const { type, service, settings } = ctx.request.body;

    assertIn(type, Object.values(IntegrationType));

    const { user } = ctx.state.auth;
    authorize(user, "createIntegration", user.team);

    assertIn(service, Object.values(UserCreatableIntegrationService));

    if (has(settings, "url")) {
      assertUrl(settings.url);
    }

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
  async (ctx: APIContext) => {
    const { id, events = [], settings } = ctx.request.body;
    assertUuid(id, "id is required");

    const { user } = ctx.state.auth;
    const integration = await Integration.findByPk(id);
    authorize(user, "update", integration);

    assertArray(events, "events must be an array");

    if (has(settings, "url")) {
      assertUrl(settings.url);
    }

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
  async (ctx: APIContext) => {
    const { id } = ctx.request.body;
    assertUuid(id, "id is required");

    const { user } = ctx.state.auth;
    const integration = await Integration.findByPk(id);
    authorize(user, "delete", integration);

    await integration.destroy();
    await Event.create({
      name: "integrations.delete",
      modelId: integration.id,
      teamId: integration.teamId,
      actorId: user.id,
      ip: ctx.request.ip,
    });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
