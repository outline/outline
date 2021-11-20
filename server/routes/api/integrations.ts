import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { Event } from "@server/models";
import Integration from "@server/models/Integration";
import policy from "@server/policies";
import { presentIntegration } from "@server/presenters";
import { assertSort, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("integrations.list", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { sort = "updatedAt" } = ctx.body;
  if (direction !== "ASC") direction = "DESC";
  assertSort(sort, Integration);

  const user = ctx.state.user;
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

router.post("integrations.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const user = ctx.state.user;
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
