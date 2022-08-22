import Router from "koa-router";
import { has } from "lodash";
import { IntegrationType } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { Event } from "@server/models";
import Integration, {
  UserCreatableIntegrationService,
} from "@server/models/Integration";
import { authorize } from "@server/policies";
import { presentIntegration } from "@server/presenters";
import {
  assertSort,
  assertUuid,
  assertArray,
  assertIn,
  assertUrl,
} from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("integrations.list", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { sort = "updatedAt" } = ctx.body;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  assertSort(sort, Integration);

  const { user } = ctx.state;
  const integrations = await Integration.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: integrations.map(presentIntegration),
  };
});

router.post("integrations.create", auth({ admin: true }), async (ctx) => {
  const { type, service, settings } = ctx.body;

  assertIn(type, Object.values(IntegrationType));

  const { user } = ctx.state;
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
});

router.post("integrations.update", auth({ admin: true }), async (ctx) => {
  const { id, events = [], settings } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const integration = await Integration.findByPk(id);
  authorize(user, "update", integration);

  assertArray(events, "events must be an array");

  if (has(settings, "url")) {
    assertUrl(settings.url);
  }

  if (integration.type === IntegrationType.Post) {
    integration.set({
      events: events.filter((event: string) =>
        ["documents.update", "documents.publish"].includes(event)
      ),
    });
  }

  integration.set({
    settings,
  });

  await integration.save();

  ctx.body = {
    data: presentIntegration(integration),
  };
});

router.post("integrations.delete", auth({ admin: true }), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
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
});

export default router;
