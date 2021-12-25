import fractionalIndex from "fractional-index";
import Router from "koa-router";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { Collection, Document, Pin, Event } from "@server/models";
import policy from "@server/policies";
import {
  presentPin,
  presentDocument,
  presentPolicies,
} from "@server/presenters";
import { sequelize, Op } from "@server/sequelize";
import { assertUuid, assertIndexCharacters } from "@server/validation";
import pagination from "./middlewares/pagination";

const MAX_PINS = 8;
const { authorize } = policy;
const router = new Router();

router.post("pins.create", auth(), async (ctx) => {
  const { documentId, collectionId } = ctx.body;
  let { index } = ctx.body;
  assertUuid(documentId, "documentId is required");

  const { user } = ctx.state;
  const document = await Document.findByPk(documentId, {
    userId: user.id,
  });
  authorize(user, "read", document);

  if (!collectionId) {
    authorize(user, "createPin", user.team);
  }

  if (collectionId) {
    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);
    authorize(user, "update", collection);
    authorize(user, "pin", document);
  }

  const where = {
    teamId: user.teamId,
    ...(collectionId ? { collectionId } : { collectionId: { [Op.eq]: null } }),
  };

  const count = await Pin.count({ where });
  if (count >= MAX_PINS) {
    throw ValidationError(`You cannot pin more than ${MAX_PINS} documents`);
  }

  if (index) {
    assertIndexCharacters(
      index,
      "Index characters must be between x20 to x7E ASCII"
    );
  } else {
    const pins = await Pin.findAll({
      where,
      attributes: ["id", "index", "updatedAt"],
      limit: 1,
      order: [
        // using LC_COLLATE:"C" because we need byte order to drive the sorting
        sequelize.literal('"pins"."index" collate "C" DESC'),
        ["updatedAt", "ASC"],
      ],
    });

    index = fractionalIndex(pins.length ? pins[0].index : null, null);
  }

  const pin = await Pin.create({
    createdById: user.id,
    teamId: user.teamId,
    collectionId,
    documentId,
    index,
  });

  await Event.create({
    name: "pins.create",
    modelId: pin.id,
    teamId: user.teamId,
    actorId: user.id,
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentPin(pin),
    policies: presentPolicies(user, [pin]),
  };
});

router.post("pins.list", auth(), pagination(), async (ctx) => {
  const { collectionId } = ctx.body;
  const { user } = ctx.state;

  const pins = await Pin.findAll({
    where: {
      ...(collectionId
        ? { collectionId }
        : { collectionId: { [Op.eq]: null } }),
      teamId: user.teamId,
    },
    order: [
      sequelize.literal('"pins"."index" collate "C"'),
      ["updatedAt", "DESC"],
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const documents = await Document.defaultScopeWithUser(user.id).findAll({
    where: {
      id: pins.map((pin: any) => pin.documentId),
    },
  });

  const policies = presentPolicies(user, [...documents, ...pins]);

  ctx.body = {
    pagination: ctx.state.pagination,
    data: {
      pins: pins.map(presentPin),
      documents: await Promise.all(
        documents.map((document: any) => presentDocument(document))
      ),
    },
    policies,
  };
});

router.post("pins.update", auth(), async (ctx) => {
  const { id, index } = ctx.body;
  assertUuid(id, "id is required");

  assertIndexCharacters(
    index,
    "Index characters must be between x20 to x7E ASCII"
  );

  const { user } = ctx.state;
  const pin = await Pin.findByPk(id);
  const document = await Document.findByPk(pin.documentId, {
    userId: user.id,
  });

  if (pin.collectionId) {
    authorize(user, "pin", document);
  } else {
    authorize(user, "updatePin", user.team);
  }

  pin.index = index;
  await pin.save();

  await Event.create({
    name: "pins.update",
    modelId: pin.id,
    teamId: user.teamId,
    actorId: user.id,
    ip: ctx.request.ip,
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
  const document = await Document.findByPk(pin.documentId, {
    userId: user.id,
  });
  if (pin.collectionId) {
    authorize(user, "pin", document);
  } else {
    authorize(user, "deletePin", user.team);
  }

  await pin.destroy();

  await Event.create({
    name: "pins.delete",
    modelId: pin.id,
    teamId: user.teamId,
    actorId: user.id,
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
