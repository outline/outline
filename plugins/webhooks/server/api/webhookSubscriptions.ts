import Router from "koa-router";
import compact from "lodash/compact";
import isEmpty from "lodash/isEmpty";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { WebhookSubscription } from "@server/models";
import { authorize } from "@server/policies";
import pagination from "@server/routes/api/middlewares/pagination";
import { APIContext, AuthenticationType } from "@server/types";
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
  auth({
    role: UserRole.Admin,
    type: [AuthenticationType.API, AuthenticationType.APP],
  }),
  validate(T.WebhookSubscriptionsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.WebhookSubscriptionsCreateReq>) => {
    const { name, url, secret, events } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createWebhookSubscription", user.team);

    const webhookSubscription = await WebhookSubscription.createWithCtx(ctx, {
      name,
      url,
      events: compact(events),
      enabled: true,
      secret: isEmpty(secret) ? undefined : secret,
      createdById: user.id,
      teamId: user.teamId,
    });

    ctx.body = {
      data: presentWebhookSubscription(webhookSubscription),
    };
  }
);

router.post(
  "webhookSubscriptions.delete",
  auth({
    role: UserRole.Admin,
    type: [AuthenticationType.API, AuthenticationType.APP],
  }),
  validate(T.WebhookSubscriptionsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.WebhookSubscriptionsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const webhookSubscription = await WebhookSubscription.findByPk(id, {
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    authorize(user, "delete", webhookSubscription);

    await webhookSubscription.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "webhookSubscriptions.update",
  auth({
    role: UserRole.Admin,
    type: [AuthenticationType.API, AuthenticationType.APP],
  }),
  validate(T.WebhookSubscriptionsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.WebhookSubscriptionsUpdateReq>) => {
    const { id, name, url, secret, events } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const webhookSubscription = await WebhookSubscription.findByPk(id, {
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    authorize(user, "update", webhookSubscription);

    await webhookSubscription.updateWithCtx(ctx, {
      name,
      url,
      events: compact(events),
      enabled: true,
      secret: isEmpty(secret) ? undefined : secret,
    });

    ctx.body = {
      data: presentWebhookSubscription(webhookSubscription),
    };
  }
);

export default router;
