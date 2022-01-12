import invariant from "invariant";
import Router from "koa-router";
import { Sequelize, Op } from "sequelize";
import pinCreator from "@server/commands/pinCreator";
import pinDestroyer from "@server/commands/pinDestroyer";
import pinUpdater from "@server/commands/pinUpdater";
import auth from "@server/middlewares/authentication";
import { Collection, Document, Pin } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentPin,
  presentDocument,
  presentPolicies,
} from "@server/presenters";
import { assertUuid, assertIndexCharacters } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("pins.create", auth(), async (ctx) => {
  const { documentId, collectionId } = ctx.body;
  const { index } = ctx.body;
  assertUuid(documentId, "documentId is required");

  const { user } = ctx.state;
  const document = await Document.findByPk(documentId, {
    userId: user.id,
  });
  authorize(user, "read", document);

  if (collectionId) {
    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);
    authorize(user, "update", collection);
    authorize(user, "pin", document);
  } else {
    authorize(user, "pinToHome", document);
  }

  if (index) {
    assertIndexCharacters(index);
  }

  const pin = await pinCreator({
    user,
    documentId,
    collectionId,
    ip: ctx.request.ip,
    index,
  });

  ctx.body = {
    data: presentPin(pin),
    policies: presentPolicies(user, [pin]),
  };
});

router.post("pins.list", auth(), pagination(), async (ctx) => {
  const { collectionId } = ctx.body;
  const { user } = ctx.state;

  const [pins, collectionIds] = await Promise.all([
    Pin.findAll({
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
    }),
    user.collectionIds(),
  ]);

  const documents = await Document.defaultScopeWithUser(user.id).findAll({
    where: {
      id: pins.map((pin) => pin.documentId),
      collectionId: collectionIds,
    },
  });

  const policies = presentPolicies(user, [...documents, ...pins]);

  ctx.body = {
    pagination: ctx.state.pagination,
    data: {
      pins: pins.map(presentPin),
      documents: await Promise.all(
        documents.map((document: Document) => presentDocument(document))
      ),
    },
    policies,
  };
});

router.post("pins.update", auth(), async (ctx) => {
  const { id, index } = ctx.body;
  assertUuid(id, "id is required");

  assertIndexCharacters(index);

  const { user } = ctx.state;
  let pin = await Pin.findByPk(id);
  invariant(pin, "pin not found");

  const document = await Document.findByPk(pin.documentId, {
    userId: user.id,
  });

  if (pin.collectionId) {
    authorize(user, "pin", document);
  } else {
    authorize(user, "update", pin);
  }

  pin = await pinUpdater({
    user,
    pin,
    ip: ctx.request.ip,
    index,
  });

  ctx.body = {
    data: presentPin(pin),
    policies: presentPolicies(user, [pin]),
  };
});

router.post("pins.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const pin = await Pin.findByPk(id);
  invariant(pin, "pin not found");

  const document = await Document.findByPk(pin.documentId, {
    userId: user.id,
  });

  if (pin.collectionId) {
    authorize(user, "unpin", document);
  } else {
    authorize(user, "delete", pin);
  }

  await pinDestroyer({ user, pin, ip: ctx.request.ip });

  ctx.body = {
    success: true,
  };
});

export default router;
