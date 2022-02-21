import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { Event } from "@server/models";
import Integration from "@server/models/Integration";
import { authorize } from "@server/policies";
import { presentIntegration } from "@server/presenters";
import { assertSort, assertUuid, assertArray } from "@server/validation";
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

router.post("integrations.update", auth(), async (ctx) => {
  const { id, events } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const integration = await Integration.findByPk(id);
  authorize(user, "update", integration);

  assertArray(events, "events must be an array");

  if (integration.type === "post") {
    integration.events = events.filter((event: string) =>
      ["documents.update", "documents.publish"].includes(event)
    );
  }

  await integration.save();

  ctx.body = {
    data: presentIntegration(integration),
  };
});

router.post("integrations.delete", auth(), async (ctx) => {
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
