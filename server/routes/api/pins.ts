import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { Collection, Document, Pin, Event } from "@server/models";
import policy from "@server/policies";
import {
  presentPin,
  presentDocument,
  presentPolicies,
} from "@server/presenters";
import { assertPresent, assertUuid } from "@server/validation";
import pagination from "./middlewares/pagination";

const { authorize } = policy;
const router = new Router();

router.post("pins.create", auth(), async (ctx) => {
  const { documentId, collectionId } = ctx.body;
  assertUuid(documentId, "documentId is required");

  const { user } = ctx.state;
  const document = await Document.findByPk(documentId, {
    userId: user.id,
  });
  authorize(user, "pin", document);

  if (collectionId) {
    const collection = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collectionId);
    authorize(user, "read", collection);
  }

  const pin = await Pin.create({
    createdById: user.id,
    teamId: user.teamId,
    collectionId,
    documentId,
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
      ...(collectionId ? { collectionId } : {}),
      teamId: user.teamId,
    },
    order: [["createdAt", "DESC"]],
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

router.post("pins.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const pin = await Pin.findByPk(id);
  const document = await Document.findByPk(pin.documentId, {
    userId: user.id,
  });
  authorize(user, "pin", document);

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
