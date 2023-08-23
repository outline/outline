import Router from "koa-router";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import subscriptionDestroyer from "@server/commands/subscriptionDestroyer";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Subscription, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentSubscription } from "@server/presenters";
import { APIContext } from "@server/types";
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
