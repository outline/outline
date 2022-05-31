import Router from "koa-router";
import { compact } from "lodash";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { WebhookSubscription } from "@server/models";
import { authorize } from "@server/policies";
import { presentWebhookSubscription } from "@server/presenters";
import { assertArray, assertPresent, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("webhookSubscriptions.list", auth(), pagination(), async (ctx) => {
  const { user } = ctx.state;
  const webhooks = await WebhookSubscription.findAll({
    where: {
      createdById: user.id,
    },
    order: [["createdAt", "DESC"]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: webhooks.map(presentWebhookSubscription),
  };
});

router.post("webhookSubscriptions.create", auth(), async (ctx) => {
  const { user } = ctx.state;
  authorize(user, "createWebhookSubscription", user.team);

  const { name, url } = ctx.request.body;
  const events = compact(ctx.request.body.events);
  assertPresent(name, "name is required");
  assertPresent(url, "url is required");
  assertArray(events, "events is required");
  if (events.length === 0) {
    throw ValidationError("events are required");
  }

  console.debug("Creating webhook subscription", {
    name,
    events,
    url,
    count: events.length,
  });
  const webhookSubscription = await WebhookSubscription.create({
    name,
    events,
    createdById: user.id,
    url,
    secret: "TODO:CHANGE ME",
    enabled: true,
  });

  ctx.body = {
    data: presentWebhookSubscription(webhookSubscription),
  };
});

router.post("webhookSubscriptions.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");
  const { user } = ctx.state;
  const key = await WebhookSubscription.findByPk(id);

  authorize(user, "delete", key);

  await key.destroy();
});

export default router;
