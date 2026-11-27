import Router from "@koa/router";
import { Sequelize } from "sequelize";
import starCreator from "@server/commands/starCreator";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Star, Collection } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentStar,
  presentDocuments,
  presentPolicies,
} from "@server/presenters";
import type { Context } from "@server/types";
import { starIndexing } from "@server/utils/indexing";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "stars.create",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.StarsCreateSchema),
  transaction(),
  async (ctx: Context<T.StarsCreateReq>) => {
    const { transaction } = ctx;
    const { documentId, collectionId, index } = ctx.input.body;
    const { user } = ctx.auth;

    let document: Document | null = null;
    let collection: Collection | null = null;

    if (documentId) {
      document = await Document.findByPk(documentId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "star", document);
    }

    if (collectionId) {
      collection = await Collection.findByPk(collectionId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "star", collection);
    }

    const star = await starCreator({
      ctx,
      user,
      documentId: document?.id,
      collectionId: collection?.id,
      index,
    });

    ctx.body = {
      data: presentStar(star),
      policies: presentPolicies(user, [star]),
    };
  }
);

router.post(
  "stars.list",
  auth(),
  pagination(),
  validate(T.StarsListSchema),
  async (ctx: Context<T.StarsListReq>) => {
    const { user } = ctx.auth;

    const stars = await Star.findAll({
      where: {
        userId: user.id,
      },
      order: [
        Sequelize.literal('"star"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const nullIndex = stars.findIndex((star) => star.index === null);

    if (nullIndex !== -1) {
      const indexedStars = await starIndexing(user.id);
      stars.forEach((star) => {
        star.index = indexedStars[star.id];
      });
    }

    const documentIds = stars
      .map((star) => star.documentId)
      .filter(Boolean) as string[];
    const documents = documentIds.length
      ? await Document.findAllWithCtx(ctx, {
          includeDrafts: true,
          where: {
            id: documentIds,
          },
        })
      : [];

    const policies = presentPolicies(user, [...documents, ...stars]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        stars: stars.map(presentStar),
        documents: await presentDocuments(ctx, documents),
      },
      policies,
    };
  }
);

router.post(
  "stars.update",
  auth(),
  validate(T.StarsUpdateSchema),
  transaction(),
  async (ctx: Context<T.StarsUpdateReq>) => {
    const { id, index } = ctx.input.body;
    const { user } = ctx.auth;
    const { transaction } = ctx;

    const star = await Star.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "update", star);

    await star.updateWithCtx(ctx, { index });

    ctx.body = {
      data: presentStar(star),
      policies: presentPolicies(user, [star]),
    };
  }
);

router.post(
  "stars.delete",
  auth(),
  validate(T.StarsDeleteSchema),
  transaction(),
  async (ctx: Context<T.StarsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.auth;
    const { transaction } = ctx;

    const star = await Star.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", star);

    await star.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
