import Router from "koa-router";
import { compact } from "lodash";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { WebhookSubscription, Event } from "@server/models";
import { authorize } from "@server/policies";
import { presentWebhookSubscription } from "@server/presenters";
import { WebhookSubscriptionEvent } from "@server/types";
import { assertArray, assertPresent, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("webhookSubscriptions.list", auth(), pagination(), async (ctx) => {
  const { user } = ctx.state;
  authorize(user, "listWebhookSubscription", user.team);
  const webhooks = await WebhookSubscription.findAll({
    where: {
      teamId: user.teamId,
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
  const events: string[] = compact(ctx.request.body.events);
  assertPresent(name, "name is required");
  assertPresent(url, "url is required");
  assertArray(events, "events is required");
  if (events.length === 0) {
    throw ValidationError("events are required");
  }

  const webhookSubscription = await WebhookSubscription.create({
    name,
    events,
    createdById: user.id,
    teamId: user.teamId,
    url,
    enabled: true,
  });

  const event: WebhookSubscriptionEvent = {
    name: "webhook_subscriptions.create",
    modelId: webhookSubscription.id,
    teamId: user.teamId,
    actorId: user.id,
    data: {
      name,
      url,
      events,
    },
    ip: ctx.request.ip,
  };
  await Event.create(event);

  ctx.body = {
    data: presentWebhookSubscription(webhookSubscription),
  };
});

router.post("webhookSubscriptions.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");
  const { user } = ctx.state;
  const webhookSubscription = await WebhookSubscription.findByPk(id);

  authorize(user, "delete", webhookSubscription);

  await webhookSubscription.destroy();

  const event: WebhookSubscriptionEvent = {
    name: "webhook_subscriptions.delete",
    modelId: webhookSubscription.id,
    teamId: user.teamId,
    actorId: user.id,
    data: {
      name: webhookSubscription.name,
      url: webhookSubscription.url,
      events: webhookSubscription.events,
    },
    ip: ctx.request.ip,
  };
  await Event.create(event);
});

router.post("webhookSubscriptions.update", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");
  const { user } = ctx.state;

  const { name, url } = ctx.request.body;
  const events: string[] = compact(ctx.request.body.events);
  assertPresent(name, "name is required");
  assertPresent(url, "url is required");
  assertArray(events, "events is required");
  if (events.length === 0) {
    throw ValidationError("events are required");
  }

  const webhookSubscription = await WebhookSubscription.findByPk(id);

  authorize(user, "update", webhookSubscription);

  await webhookSubscription.update({ name, url, events, enabled: true });

  const event: WebhookSubscriptionEvent = {
    name: "webhook_subscriptions.update",
    modelId: webhookSubscription.id,
    teamId: user.teamId,
    actorId: user.id,
    data: {
      name: webhookSubscription.name,
      url: webhookSubscription.url,
      events: webhookSubscription.events,
    },
    ip: ctx.request.ip,
  };
  await Event.create(event);

  ctx.body = {
    data: presentWebhookSubscription(webhookSubscription),
  };
});

export default router;
