import invariant from "invariant";
import Router from "koa-router";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import subscriptionDestroyer from "@server/commands/subscriptionDestroyer";
import { sequelize } from "@server/database/sequelize";
import auth from "@server/middlewares/authentication";
import { Subscription, Event, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentSubscription } from "@server/presenters";
import { SubscriptionEvent } from "@server/types";
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

  const subscriptions = await sequelize.transaction(async (transaction) => {
    const document = await Document.findByPk(documentId, { transaction });

    authorize(user, "listSubscription", document);

    return Subscription.findAll({
      where: {
        documentId: document.id,
        event,
      },
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
      transaction,
    });
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: subscriptions.map(presentSubscription),
  };
});

router.post("subscriptions.info", auth(), pagination(), async (ctx) => {
  const { user } = ctx.state;

  const subscriptions = await Subscription.findAll({
    where: {
      userId: user.id,
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
    const document = await Document.findByPk(documentId, { transaction });

    authorize(user, "createSubscription", document);

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

router.post("subscriptions.update", auth(), async (ctx) => {
  // Body should not include `event` like other routes above.
  // That would imply move on a subscription model.
  const { id, enabled } = ctx.body;

  assertUuid(id, "id is required");

  const { user } = ctx.state;

  const subscription = await Subscription.findByPk(id);

  authorize(user, "update", subscription);

  invariant(
    subscription.documentId,
    "Subscription must have an associated document"
  );

  await subscription.update({ user, subscription, enabled });

  if (subscription.changed()) {
    const subscriptionEvent: SubscriptionEvent = {
      name: "subscriptions.update",
      actorId: user.id,
      userId: user.userId,
      documentId: subscription.documentId,
      teamId: user.teamId,
      modelId: subscription.id,
      ip: ctx.request.ip,
    };

    await Event.create(subscriptionEvent);
  }

  ctx.body = {
    data: presentSubscription(subscription),
  };
});

router.post("subscriptions.delete", auth(), async (ctx) => {
  const { id } = ctx.body;

  assertUuid(id, "id is required");

  const { user } = ctx.state;

  await sequelize.transaction(async (transaction) => {
    const subscription = await Subscription.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
    });

    authorize(user, "delete", subscription);

    const subscriptionEvent: SubscriptionEvent = {
      teamId: user.teamId,
      actorId: user.id,
      ip: ctx.request.ip,
      name: "subscriptions.delete",
      modelId: subscription.id,
      userId: user.userId,
      documentId: subscription.documentId,
    };

    await subscriptionDestroyer({
      user,
      subscription,
      ip: ctx.ip,
      transaction,
    });

    await Event.create(subscriptionEvent);

    return subscription;
  });

  ctx.body = {
    success: true,
  };
});

export default router;
