// @flow
import Router from "koa-router";
import Sequelize from "sequelize";
import { NotFoundError } from "../errors";
import auth from "../middlewares/authentication";
import { Document, User, Event, Share, Team } from "../models";
import policy from "../policies";
import { presentShare, presentPolicies } from "../presenters";
import pagination from "./middlewares/pagination";

const Op = Sequelize.Op;
const { authorize } = policy;
const router = new Router();

router.post("shares.info", auth(), async (ctx) => {
  const { id, documentId } = ctx.body;
  ctx.assertUuid(id || documentId, "id or documentId is required");

  const user = ctx.state.user;
  const share = await Share.findOne({
    where: id
      ? {
          id,
          revokedAt: { [Op.eq]: null },
        }
      : {
          documentId,
          teamId: user.teamId,
          revokedAt: { [Op.eq]: null },
        },
  });
  if (!share || !share.document) {
    return (ctx.response.status = 204);
  }

  authorize(user, "read", share);

  ctx.body = {
    data: presentShare(share, user.isAdmin),
    policies: presentPolicies(user, [share]),
  };
});

router.post("shares.list", auth(), pagination(), async (ctx) => {
  let { sort = "updatedAt", direction } = ctx.body;
  if (direction !== "ASC") direction = "DESC";
  ctx.assertSort(sort, Share);

  const user = ctx.state.user;
  const where = {
    teamId: user.teamId,
    userId: user.id,
    published: true,
    revokedAt: { [Op.eq]: null },
  };

  if (user.isAdmin) {
    delete where.userId;
  }

  const collectionIds = await user.collectionIds();
  const shares = await Share.findAll({
    where,
    order: [[sort, direction]],
    include: [
      {
        model: Document,
        required: true,
        paranoid: true,
        as: "document",
        where: {
          collectionId: collectionIds,
        },
      },
      {
        model: User,
        required: true,
        as: "user",
      },
      {
        model: Team,
        required: true,
        as: "team",
      },
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: shares.map((share) => presentShare(share, user.isAdmin)),
    policies: presentPolicies(user, shares),
  };
});

router.post("shares.update", auth(), async (ctx) => {
  const { id, published } = ctx.body;
  ctx.assertUuid(id, "id is required");
  ctx.assertPresent(published, "published is required");

  const user = ctx.state.user;
  const share = await Share.findByPk(id);
  authorize(user, "update", share);

  share.published = published;
  await share.save();

  await Event.create({
    name: "shares.update",
    documentId: share.documentId,
    modelId: share.id,
    teamId: user.teamId,
    actorId: user.id,
    data: { published },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentShare(share, user.isAdmin),
    policies: presentPolicies(user, [share]),
  };
});

router.post("shares.create", auth(), async (ctx) => {
  const { documentId } = ctx.body;
  ctx.assertPresent(documentId, "documentId is required");

  const user = ctx.state.user;
  const document = await Document.findByPk(documentId, { userId: user.id });
  const team = await Team.findByPk(user.teamId);
  authorize(user, "share", document);
  authorize(user, "share", team);

  const [share, isCreated] = await Share.findOrCreate({
    where: {
      documentId,
      teamId: user.teamId,
      revokedAt: null,
    },
    defaults: {
      userId: user.id,
    },
  });

  if (isCreated) {
    await Event.create({
      name: "shares.create",
      documentId,
      collectionId: document.collectionId,
      modelId: share.id,
      teamId: user.teamId,
      actorId: user.id,
      data: { name: document.title },
      ip: ctx.request.ip,
    });
  }

  share.team = team;
  share.user = user;
  share.document = document;

  ctx.body = {
    data: presentShare(share),
    policies: presentPolicies(user, [share]),
  };
});

router.post("shares.revoke", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertUuid(id, "id is required");

  const user = ctx.state.user;
  const share = await Share.findByPk(id);
  authorize(user, "revoke", share);

  const document = await Document.findByPk(share.documentId);
  if (!document) {
    throw new NotFoundError();
  }

  await share.revoke(user.id);

  await Event.create({
    name: "shares.revoke",
    documentId: document.id,
    collectionId: document.collectionId,
    modelId: share.id,
    teamId: user.teamId,
    actorId: user.id,
    data: { name: document.title },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
