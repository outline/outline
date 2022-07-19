import invariant from "invariant";
import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { Subscription, Event, Document } from "@server/models";
import { authorize } from "@server/policies";
import { presentSubscription } from "@server/presenters";
import { SubscriptionEvent } from "@server/types";
import { assertUuid } from "@server/validation";
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

router.post(
  "subscriptions.list",

  auth(),
  pagination(),

  async (ctx) => {
    const { user } = ctx.state;
    const { documentId } = ctx.body;

    const document = await Document.findByPk(documentId);

    authorize(user, "listSubscription", document);

    const subscriptions = await Subscription.findAll({
      where: {
        documentId: document.id,
      },

      order: [["createdAt", "DESC"]],

      offset: ctx.state.pagination.offset,

      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      subscriptions: subscriptions.map(presentSubscription),
    };
  }
);

router.post(
  "subscriptions.create",

  auth(),

  async (ctx) => {
    const { user } = ctx.state;
    const { documentId } = ctx.body;

    const document = await Document.findByPk(documentId);

    authorize(user, "createSubscription", document);

    const subscription = await Subscription.create({
      userId: user.id,
      documentId: document.id,
      // Doesn't make sense to create a disabled subscription.
      enabled: true,
    });

    const event: SubscriptionEvent = {
      name: "subscriptions.create",
      modelId: subscription.id,
      actorId: user.id,
      // REVIEW: Should `teamId` be required?
      // Set via `SubscriptionEvent` type.
      teamId: user.teamId,
      userId: user.userId,
      documentId: document.id,
      enabled: subscription.enabled,
      ip: ctx.request.ip,
    };

    await Event.create(event);

    ctx.body = {
      subscriptions: presentSubscription(subscription),
    };
  }
);

router.post(
  "subscriptions.update",

  auth(),

  async (ctx) => {
    const { subscriptionId, enabled } = ctx.body;

    assertUuid(subscriptionId, "subscriptionId is required");

    const { user } = ctx.state;

    const subscription = await Subscription.findByPk(subscriptionId);

    authorize(user, "update", subscription);

    invariant(
      subscription.documentId,
      "Subscription must have an associated document"
    );

    await subscription.update({ userId: user.id, subscription, enabled });

    const event: SubscriptionEvent = {
      name: "subscriptions.create",
      modelId: subscription.id,
      actorId: user.id,
      teamId: user.teamId,
      userId: user.userId,
      documentId: subscription.documentId,
      enabled: subscription.enabled,
      ip: ctx.request.ip,
    };

    await Event.create(event);

    ctx.body = {
      subscriptions: presentSubscription(subscription),
    };
  }
);

router.post(
  "Subscriptions.delete",

  auth(),

  async (ctx) => {
    const { subscriptionId } = ctx.body;

    assertUuid(subscriptionId, "subscriptionId is required");

    const { user } = ctx.state;
    const subscription = await Subscription.findByPk(subscriptionId);

    authorize(user, "delete", subscription);

    invariant(
      subscription.documentId,
      "Subscription must have an associated document"
    );

    await subscription.destroy();

    const event: SubscriptionEvent = {
      name: "subscriptions.create",
      modelId: subscription.id,
      actorId: user.id,
      teamId: user.teamId,
      userId: user.userId,
      documentId: subscription.documentId,
      enabled: subscription.enabled,
      ip: ctx.request.ip,
    };
    await Event.create(event);
  }
);

export default router;
