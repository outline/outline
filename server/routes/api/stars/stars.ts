import Router from "koa-router";
import { Sequelize } from "sequelize";
import starCreator from "@server/commands/starCreator";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, Star, Collection } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentStar,
  presentDocument,
  presentPolicies,
} from "@server/presenters";
import { APIContext } from "@server/types";
import { starIndexing } from "@server/utils/indexing";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "stars.create",
  auth(),
  validate(T.StarsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.StarsCreateReq>) => {
    const { transaction } = ctx.state;
    const { documentId, collectionId, index } = ctx.input.body;
    const { user } = ctx.state.auth;

    if (documentId) {
      const document = await Document.findByPk(documentId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "star", document);
    }

    if (collectionId) {
      const collection = await Collection.scope({
        method: ["withMembership", user.id],
      }).findByPk(collectionId, { transaction });
      authorize(user, "star", collection);
    }

    const star = await starCreator({
      ctx,
      user,
      documentId,
      collectionId,
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
  async (ctx: APIContext<T.StarsListReq>) => {
    const { user } = ctx.state.auth;

    const [stars, collectionIds] = await Promise.all([
      Star.findAll({
        where: {
          userId: user.id,
        },
        order: [
          Sequelize.literal('"star"."index" collate "C"'),
          ["updatedAt", "DESC"],
        ],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      user.collectionIds(),
    ]);

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
      ? await Document.withMembershipScope(user.id).findAll({
          where: {
            id: documentIds,
            collectionId: collectionIds,
          },
        })
      : [];

    const policies = presentPolicies(user, [...documents, ...stars]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        stars: stars.map(presentStar),
        documents: await Promise.all(
          documents.map((document: Document) => presentDocument(ctx, document))
        ),
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
  async (ctx: APIContext<T.StarsUpdateReq>) => {
    const { id, index } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

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
  async (ctx: APIContext<T.StarsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

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
