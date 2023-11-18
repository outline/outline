import Router from "koa-router";
import { Transaction } from "sequelize";
import { QueryNotices } from "@shared/types";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import subscriptionDestroyer from "@server/commands/subscriptionDestroyer";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Subscription, Document, User } from "@server/models";
import SubscriptionHelper from "@server/models/helpers/SubscriptionHelper";
import { authorize } from "@server/policies";
import { presentSubscription } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "subscriptions.list",
  auth(),
  pagination(),
  validate(T.SubscriptionsListSchema),
  async (ctx: APIContext<T.SubscriptionsListReq>) => {
    const { user } = ctx.state.auth;
    const { documentId, event } = ctx.input.body;

    const document = await Document.findByPk(documentId, { userId: user.id });

    authorize(user, "read", document);

    const subscriptions = await Subscription.findAll({
      where: {
        documentId: document.id,
        userId: user.id,
        event,
      },
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: subscriptions.map(presentSubscription),
    };
  }
);

router.post(
  "subscriptions.info",
  auth(),
  validate(T.SubscriptionsInfoSchema),
  async (ctx: APIContext<T.SubscriptionsInfoReq>) => {
    const { user } = ctx.state.auth;
    const { documentId, event } = ctx.input.body;

    const document = await Document.findByPk(documentId, { userId: user.id });

    authorize(user, "read", document);

    // There can be only one subscription with these props.
    const subscription = await Subscription.findOne({
      where: {
        userId: user.id,
        documentId: document.id,
        event,
      },
      rejectOnEmpty: true,
    });

    ctx.body = {
      data: presentSubscription(subscription),
    };
  }
);

router.post(
  "subscriptions.create",
  auth(),
  validate(T.SubscriptionsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.SubscriptionsCreateReq>) => {
    const { auth, transaction } = ctx.state;
    const { user } = auth;
    const { documentId, event } = ctx.input.body;

    const document = await Document.findByPk(documentId, {
      userId: user.id,
      transaction,
    });

    authorize(user, "subscribe", document);

    const subscription = await subscriptionCreator({
      user,
      documentId: document.id,
      event,
      ip: ctx.request.ip,
      transaction,
    });

    ctx.body = {
      data: presentSubscription(subscription),
    };
  }
);

router.get(
  "subscriptions.delete",
  validate(T.SubscriptionsDeleteTokenSchema),
  rateLimiter(RateLimiterStrategy.FivePerMinute),
  transaction(),
  async (ctx: APIContext<T.SubscriptionsDeleteTokenReq>) => {
    const { transaction } = ctx.state;
    const { userId, documentId, token } = ctx.input.query;

    const unsubscribeToken = SubscriptionHelper.unsubscribeToken(
      userId,
      documentId
    );

    if (unsubscribeToken !== token) {
      ctx.redirect(`${env.URL}?notice=invalid-auth`);
      return;
    }

    const [subscription, user] = await Promise.all([
      Subscription.findOne({
        where: {
          userId,
          documentId,
        },
        lock: Transaction.LOCK.UPDATE,
        rejectOnEmpty: true,
        transaction,
      }),
      User.scope("withTeam").findByPk(userId, {
        rejectOnEmpty: true,
        transaction,
      }),
    ]);

    authorize(user, "delete", subscription);

    await subscription.destroy({ transaction });

    ctx.redirect(
      `${user.team.url}/home?notice=${QueryNotices.UnsubscribeDocument}`
    );
  }
);

router.post(
  "subscriptions.delete",
  auth(),
  validate(T.SubscriptionsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.SubscriptionsDeleteReq>) => {
    const { auth, transaction } = ctx.state;
    const { user } = auth;
    const { id } = ctx.input.body;

    const subscription = await Subscription.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
    });

    authorize(user, "delete", subscription);

    await subscriptionDestroyer({
      user,
      subscription,
      ip: ctx.request.ip,
      transaction,
    });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
