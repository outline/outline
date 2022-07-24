import invariant from "invariant";
import Router from "koa-router";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { sequelize } from "@server/database/sequelize";
import auth from "@server/middlewares/authentication";
import { Subscription, Event, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentSubscription } from "@server/presenters";
import { SubscriptionEvent } from "@server/types";
import { assertIn, assertPresent, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post(
  "subscriptions.list",

  auth(),
  pagination(),

  async (ctx) => {
    const { user } = ctx.state;

    const { documentId, event } = ctx.body;

    assertPresent(documentId, "documentId is required");

    // Make sure `documentId` is accompanied
    // with valid subsribable events.
    assertIn(
      event,
      ["documents.update"],
      `${event} is not a valid subscription event for documents`
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
  }
);

router.post(
  "subscriptions.info",

  auth(),

  async (ctx) => {
    const { documentId, event } = ctx.body;

    const { user } = ctx.state;

    assertPresent(documentId, "documentId is required");

    // Make sure `documentId` is accompanied
    // with valid subsribable events.
    assertIn(
      event,
      ["documents.update"],
      `${event} is not a valid subscription event for documents`
    );

    const subscription = await sequelize.transaction(async (transaction) => {
      const document = await Document.findByPk(documentId, { transaction });

      authorize(user, "read", document);

      const subscription = await Subscription.findOne({
        where: {
          documentId: document.id,
          userId: user.id,
          event,
        },
      });

      authorize(user, "read", subscription);

      return subscription;
    });

    ctx.body = {
      data: presentSubscription(subscription),
    };
  }
);

router.post(
  "subscriptions.create",

  auth(),

  async (ctx) => {
    const { user } = ctx.state;

    const { documentId, event } = ctx.body;

    assertPresent(documentId, "documentId is required");

    // Make sure `documentId` is accompanied
    // with valid subsribable events.
    assertIn(
      event,
      ["documents.update"],
      `${event} is not a valid subscription event for documents`
    );

    const subscription = await sequelize.transaction(async (transaction) => {
      const document = await Document.findByPk(documentId, { transaction });

      authorize(user, "createSubscription", document);

      return subscriptionCreator({
        user: user,
        documentId: document.id,
        event,
        ip: ctx.request.ip,
        transaction,
      });
    });

    ctx.body = {
      data: presentSubscription(subscription),
    };
  }
);

router.post(
  "subscriptions.update",

  auth(),

  async (ctx) => {
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
  }
);

router.post(
  "subscriptions.delete",

  auth(),

  async (ctx) => {
    const { id } = ctx.body;

    assertUuid(id, "id is required");

    const { user } = ctx.state;

    const subscription = await Subscription.findByPk(id);

    assertPresent(
      subscription,
      "subscription is required, make sure subscription id is correct"
    );

    invariant(
      subscription?.documentId,
      "Subscription must have an associated document"
    );

    authorize(user, "delete", subscription);

    assertIn(
      subscription.event,
      ["documents.update"],
      `${subscription.event} is not a valid subscription event`
    );

    await subscription.destroy();

    const subscriptionEvent: SubscriptionEvent = {
      teamId: user.teamId,
      actorId: user.id,
      ip: ctx.request.ip,
      name: "subscriptions.delete",
      modelId: subscription.id,
      userId: user.userId,
      documentId: subscription.documentId,
    };

    await Event.create(subscriptionEvent);
  }
);

export default router;
