import Router from "koa-router";
import { Transaction, WhereOptions } from "sequelize";
import { QueryNotices } from "@shared/types";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { createContext } from "@server/context";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Subscription, Document, User, Collection } from "@server/models";
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
    const { event, collectionId, documentId } = ctx.input.body;

    const where: WhereOptions<Subscription> = {
      userId: user.id,
      event,
    };

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
        transaction: ctx.state.transaction,
      });
      authorize(user, "read", collection);

      where.collectionId = collectionId;
    } else {
      // documentId will be available here
      const document = await Document.findByPk(documentId!, {
        userId: user.id,
      });
      authorize(user, "read", document);

      where.documentId = documentId;
    }

    const subscriptions = await Subscription.findAll({
      where,
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
    const { event, collectionId, documentId } = ctx.input.body;

    const where: WhereOptions<Subscription> = {
      userId: user.id,
      event,
    };

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
      });
      authorize(user, "read", collection);

      where.collectionId = collectionId;
    } else {
      // documentId will be available here
      const document = await Document.findByPk(documentId!, {
        userId: user.id,
      });
      authorize(user, "read", document);

      where.documentId = documentId;
    }

    // There can be only one subscription with these props.
    const subscription = await Subscription.findOne({
      where,
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
    const { user } = ctx.state.auth;
    const { event, collectionId, documentId } = ctx.input.body;

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
      });

      authorize(user, "subscribe", collection);
    } else {
      // documentId will be available here
      const document = await Document.findByPk(documentId!, {
        userId: user.id,
      });

      authorize(user, "subscribe", document);
    }

    const subscription = await subscriptionCreator({
      ctx,
      documentId,
      collectionId,
      event,
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
    const { follow, userId, documentId, token } = ctx.input.query;

    // The link in the email does not include the follow query param, this
    // is to help prevent anti-virus, and email clients from pre-fetching the link
    if (!follow) {
      return ctx.redirectOnClient(ctx.request.href + "&follow=true");
    }

    const unsubscribeToken = SubscriptionHelper.unsubscribeToken(
      userId,
      documentId
    );

    if (unsubscribeToken !== token) {
      ctx.redirect(`${env.URL}?notice=invalid-auth`);
      return;
    }

    const [documentSubscription, document, user] = await Promise.all([
      Subscription.findOne({
        where: {
          userId,
          documentId,
        },
        lock: Transaction.LOCK.UPDATE,
        transaction,
      }),
      Document.unscoped().findOne({
        attributes: ["collectionId"],
        where: {
          id: documentId,
        },
        paranoid: false,
        transaction,
      }),
      User.scope("withTeam").findByPk(userId, {
        rejectOnEmpty: true,
        transaction,
      }),
    ]);

    const context = createContext({
      user,
      ip: ctx.request.ip,
      transaction,
    });

    const collectionSubscription = document?.collectionId
      ? await Subscription.findOne({
          where: {
            userId,
            collectionId: document.collectionId,
          },
          lock: Transaction.LOCK.UPDATE,
          transaction,
        })
      : undefined;

    if (collectionSubscription) {
      authorize(user, "delete", collectionSubscription);
      await collectionSubscription.destroyWithCtx(context);
    }

    if (documentSubscription) {
      authorize(user, "delete", documentSubscription);
      await documentSubscription.destroyWithCtx(context);
    }

    ctx.redirect(
      `${user.team.url}/home?notice=${
        collectionSubscription
          ? QueryNotices.UnsubscribeCollection
          : documentSubscription
          ? QueryNotices.UnsubscribeDocument
          : ""
      }`
    );
  }
);

router.post(
  "subscriptions.delete",
  auth(),
  validate(T.SubscriptionsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.SubscriptionsDeleteReq>) => {
    const { transaction } = ctx.state;
    const { user } = ctx.state.auth;
    const { id } = ctx.input.body;

    const subscription = await Subscription.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
    });

    authorize(user, "delete", subscription);

    await subscription.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
