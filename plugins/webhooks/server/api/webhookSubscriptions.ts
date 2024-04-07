import Router from "koa-router";
import compact from "lodash/compact";
import isEmpty from "lodash/isEmpty";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { WebhookSubscription, Event } from "@server/models";
import { authorize } from "@server/policies";
import pagination from "@server/routes/api/middlewares/pagination";
import { WebhookSubscriptionEvent, APIContext } from "@server/types";
import presentWebhookSubscription from "../presenters/webhookSubscription";
import * as T from "./schema";

const router = new Router();

router.post(
  "webhookSubscriptions.list",
  auth({ role: UserRole.Admin }),
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
  auth({ role: UserRole.Admin }),
  validate(T.WebhookSubscriptionsCreateSchema),
  async (ctx: APIContext<T.WebhookSubscriptionsCreateReq>) => {
    const { user } = ctx.state.auth;
    authorize(user, "createWebhookSubscription", user.team);

    const { name, url, secret } = ctx.input.body;
    const events: string[] = compact(ctx.input.body.events);

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
  auth({ role: UserRole.Admin }),
  validate(T.WebhookSubscriptionsDeleteSchema),
  async (ctx: APIContext<T.WebhookSubscriptionsDeleteReq>) => {
    const { id } = ctx.input.body;
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
  auth({ role: UserRole.Admin }),
  validate(T.WebhookSubscriptionsUpdateSchema),
  async (ctx: APIContext<T.WebhookSubscriptionsUpdateReq>) => {
    const { id, name, url, secret } = ctx.input.body;
    const { user } = ctx.state.auth;
    const events: string[] = compact(ctx.input.body.events);
    const webhookSubscription = await WebhookSubscription.findByPk(id, {
      rejectOnEmpty: true,
    });

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
