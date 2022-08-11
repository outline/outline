import Router from "koa-router";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import subscriptionDestroyer from "@server/commands/subscriptionDestroyer";
import { sequelize } from "@server/database/sequelize";
import auth from "@server/middlewares/authentication";
import { Subscription, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentSubscription } from "@server/presenters";
import { assertIn, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("subscriptions.list", auth(), pagination(), async (ctx) => {
  const { user } = ctx.state;
  const { documentId, event } = ctx.body;

  assertUuid(documentId, "documentId is required");

  assertIn(
    event,
    ["documents.update"],
    `Not a valid subscription event for documents`
  );

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
});

router.post("subscriptions.info", auth(), async (ctx) => {
  const { user } = ctx.state;
  const { documentId, event } = ctx.body;

  assertUuid(documentId, "documentId is required");

  assertIn(
    event,
    ["documents.update"],
    "Not a valid subscription event for documents"
  );

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
});

router.post("subscriptions.create", auth(), async (ctx) => {
  const { user } = ctx.state;
  const { documentId, event } = ctx.body;

  assertUuid(documentId, "documentId is required");

  assertIn(
    event,
    ["documents.update"],
    "Not a valid subscription event for documents"
  );

  const subscription = await sequelize.transaction(async (transaction) => {
    const document = await Document.findByPk(documentId, {
      userId: user.id,
      transaction,
    });

    authorize(user, "subscribe", document);

    return subscriptionCreator({
      user,
      documentId: document.id,
      event,
      ip: ctx.request.ip,
      transaction,
    });
  });

  ctx.body = {
    data: presentSubscription(subscription),
  };
});

router.post("subscriptions.delete", auth(), async (ctx) => {
  const { user } = ctx.state;
  const { id } = ctx.body;

  assertUuid(id, "id is required");

  await sequelize.transaction(async (transaction) => {
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

    return subscription;
  });

  ctx.body = {
    success: true,
  };
});

export default router;
