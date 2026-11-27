import Router from "@koa/router";
import { Sequelize, Op, Transaction } from "sequelize";
import pinCreator from "@server/commands/pinCreator";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Collection, Document, Pin } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentPin,
  presentDocuments,
  presentPolicies,
} from "@server/presenters";
import type { Context } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "pins.create",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.PinsCreateSchema),
  transaction(),
  async (ctx: Context<T.PinsCreateReq>) => {
    const { documentId, collectionId, index } = ctx.input.body;
    const { user } = ctx.auth;
    const { transaction } = ctx;
    const document = await Document.findByPk(documentId, {
      userId: user.id,
      transaction,
    });
    authorize(user, "read", document);

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
        transaction,
      });
      authorize(user, "pin", collection);
      authorize(user, "pin", document);

      if (document.collectionId !== collection.id) {
        throw ValidationError("Document must belong to the collection");
      }
    } else {
      authorize(user, "pinToHome", document);
    }

    const pin = await pinCreator({
      ctx,
      user,
      documentId: document.id,
      collectionId,
      index,
    });

    ctx.body = {
      data: presentPin(pin),
      policies: presentPolicies(user, [pin]),
    };
  }
);

router.post(
  "pins.info",
  auth(),
  validate(T.PinsInfoSchema),
  async (ctx: Context<T.PinsInfoReq>) => {
    const { user } = ctx.auth;
    const { documentId, collectionId } = ctx.input.body;

    const document = await Document.findByPk(documentId, {
      userId: user.id,
      includeContent: false,
    });
    authorize(user, "read", document);

    // There can be only one pin with these props.
    const pin = await Pin.findOne({
      where: {
        documentId: document.id,
        collectionId: collectionId ?? null,
        createdById: user.id,
        teamId: user.teamId,
      },
    });

    if (!pin) {
      ctx.response.status = 204;
      return;
    }

    ctx.body = {
      data: presentPin(pin),
      policies: presentPolicies(user, [pin]),
    };
  }
);

router.post(
  "pins.list",
  auth(),
  validate(T.PinsListSchema),
  pagination(),
  async (ctx: Context<T.PinsListReq>) => {
    const { collectionId } = ctx.input.body;
    const { user } = ctx.auth;

    if (collectionId) {
      const collection = await Collection.findByPk(collectionId, {
        userId: user.id,
      });
      authorize(user, "read", collection);
    }

    const pins = await Pin.findAll({
      where: {
        ...(collectionId
          ? { collectionId }
          : { collectionId: { [Op.is]: null } }),
        teamId: user.teamId,
      },
      order: [
        Sequelize.literal('"pin"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    const documents = await Document.findAllWithCtx(ctx, {
      where: {
        id: pins.map((pin) => pin.documentId),
      },
    });

    // Pins are not scoped to document memberships, so only return those for
    // documents the user can read.
    const documentIds = new Set(documents.map((document) => document.id));
    const visiblePins = pins.filter((pin) => documentIds.has(pin.documentId));

    const policies = presentPolicies(user, [...documents, ...visiblePins]);

    ctx.body = {
      pagination: ctx.state.pagination,
      data: {
        pins: visiblePins.map(presentPin),
        documents: await presentDocuments(ctx, documents),
      },
      policies,
    };
  }
);

router.post(
  "pins.update",
  auth(),
  validate(T.PinsUpdateSchema),
  transaction(),
  async (ctx: Context<T.PinsUpdateReq>) => {
    const { id, index } = ctx.input.body;
    const { user } = ctx.auth;
    const { transaction } = ctx;
    const pin = await Pin.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
    });

    const document = await Document.findByPk(pin.documentId, {
      userId: user.id,
      transaction,
    });

    if (pin.collectionId) {
      authorize(user, "pin", document);
    } else {
      authorize(user, "update", pin);
    }

    await pin.updateWithCtx(ctx, { index });

    ctx.body = {
      data: presentPin(pin),
      policies: presentPolicies(user, [pin]),
    };
  }
);

router.post(
  "pins.delete",
  auth(),
  validate(T.PinsDeleteSchema),
  transaction(),
  async (ctx: Context<T.PinsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { transaction } = ctx;

    const { user } = ctx.auth;
    const pin = await Pin.findByPk(id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
    });

    const document = await Document.findByPk(pin.documentId, {
      userId: user.id,
      transaction,
    });

    if (pin.collectionId) {
      authorize(user, "unpin", document);
    } else {
      authorize(user, "delete", pin);
    }

    await pin.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
