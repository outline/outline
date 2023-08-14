import Router from "koa-router";
import compact from "lodash/compact";
import isEmpty from "lodash/isEmpty";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { WebhookSubscription, Event } from "@server/models";
import { authorize } from "@server/policies";
import pagination from "@server/routes/api/middlewares/pagination";
import { WebhookSubscriptionEvent, APIContext } from "@server/types";
import { assertArray, assertPresent, assertUuid } from "@server/validation";
import presentWebhookSubscription from "../presenters/webhookSubscription";

const router = new Router();

router.post(
  "webhookSubscriptions.list",
  auth({ admin: true }),
  pagination(),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
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
  }
);

router.post(
  "webhookSubscriptions.create",
  auth({ admin: true }),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    authorize(user, "createWebhookSubscription", user.team);

    const { name, url, secret } = ctx.request.body;
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
      secret: isEmpty(secret) ? undefined : secret,
    });

    const event: WebhookSubscriptionEvent = {
      name: "webhookSubscriptions.create",
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
  }
);

router.post(
  "webhookSubscriptions.delete",
  auth({ admin: true }),
  async (ctx: APIContext) => {
    const { id } = ctx.request.body;
    assertUuid(id, "id is required");
    const { user } = ctx.state.auth;
    const webhookSubscription = await WebhookSubscription.findByPk(id);

    authorize(user, "delete", webhookSubscription);

    await webhookSubscription.destroy();

    const event: WebhookSubscriptionEvent = {
      name: "webhookSubscriptions.delete",
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
      success: true,
    };
  }
);

router.post(
  "webhookSubscriptions.update",
  auth({ admin: true }),
  async (ctx: APIContext) => {
    const { id } = ctx.request.body;
    assertUuid(id, "id is required");
    const { user } = ctx.state.auth;

    const { name, url, secret } = ctx.request.body;
    const events: string[] = compact(ctx.request.body.events);
    assertPresent(name, "name is required");
    assertPresent(url, "url is required");
    assertArray(events, "events is required");
    if (events.length === 0) {
      throw ValidationError("events are required");
    }

    const webhookSubscription = await WebhookSubscription.findByPk(id);

    authorize(user, "update", webhookSubscription);

    await webhookSubscription.update({
      name,
      url,
      events,
      enabled: true,
      secret: isEmpty(secret) ? undefined : secret,
    });

    const event: WebhookSubscriptionEvent = {
      name: "webhookSubscriptions.update",
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
  }
);

export default router;
