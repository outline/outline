import invariant from "invariant";
import Router from "koa-router";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { Subscription, Event, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentSubscription } from "@server/presenters";
import { SubscriptionEvent } from "@server/types";
import { assertPresent, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

/** Typical workflow involves
 * 1. Declaring required states.
 * 2. Deserializing request body.
 * 3. CRUD fetch for required data model.
 * 4. Checking authorization of actor on subject.
 * 5. CRUD operation by actor on subject.
 * 6. Ordering and pagination.
 * 7. Setting response body.
 */

const router = new Router();

const subscribableEventsDocument = ["documents.update"];

router.post(
  "subscriptions.list",

  auth(),
  pagination(),

  async (ctx) => {
    const { user } = ctx.state;
    const { documentId, event } = ctx.body;

    // Make sure `documentId` is accompanied
    // with valid subsribable events.
    if (documentId) {
      if (!subscribableEventsDocument.includes(event)) {
        throw ValidationError(
          `Event ${event} is not subscribable for documentId ${documentId}`
        );
      }
    }

    const document = await Document.findByPk(documentId);

    authorize(user, "listSubscription", document);

    const subscriptions = await Subscription.findAll({
      where: {
        documentId: document.id,
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

  async (ctx) => {
    const { documentId, event } = ctx.body;

    // Make sure `documentId` is accompanied
    // with valid subsribable events.
    if (documentId) {
      if (!subscribableEventsDocument.includes(event)) {
        throw ValidationError(
          `Event ${event} is not subscribable for documentId ${documentId}`
        );
      }
    }

    const document = await Document.findByPk(documentId);

    assertPresent(documentId, "documentId is required");

    const { user } = ctx.state;

    authorize(user, "read", document);

    const subscription = await Subscription.findOne({
      where: {
        documentId: document.id,
        userId: user.id,
        event,
      },
    });

    authorize(user, "read", subscription);

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

    // Make sure `documentId` is accompanied
    // with valid subsribable events.
    if (documentId) {
      if (!subscribableEventsDocument.includes(event)) {
        throw ValidationError(
          `Event ${event} is not subscribable for documentId ${documentId}`
        );
      }
    }

    const document = await Document.findByPk(documentId);

    authorize(user, "createSubscription", document);

    const subscription = await Subscription.create({
      userId: user.id,
      documentId: document.id,
      event,
      // Doesn't make sense to create a disabled subscription.
      enabled: true,
    });

    const subscriptionEvent: SubscriptionEvent = {
      teamId: user.teamId,
      actorId: user.id,
      ip: ctx.request.ip,
      name: "subscriptions.create",
      modelId: subscription.id,
      userId: user.userId,
      documentId: document.id,
      data: { enabled: subscription.enabled },
    };

    await Event.create(subscriptionEvent);

    ctx.body = {
      data: presentSubscription(subscription),
    };
  }
);

router.post(
  "subscriptions.update",

  auth(),

  async (ctx) => {
    // body should not include `event` like other routes above.
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

    const subscriptionEvent: SubscriptionEvent = {
      teamId: user.teamId,
      actorId: user.id,
      ip: ctx.request.ip,
      name: "subscriptions.update",
      modelId: subscription.id,
      userId: user.userId,
      documentId: subscription.documentId,
      data: { enabled: subscription.enabled },
    };

    await Event.create(subscriptionEvent);

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

    authorize(user, "delete", subscription);

    invariant(
      subscription.documentId,
      "Subscription must have an associated document"
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
      data: { enabled: subscription.enabled },
    };

    await Event.create(subscriptionEvent);
  }
);

export default router;
