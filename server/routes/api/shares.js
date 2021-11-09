// @flow
import Router from "koa-router";
import Sequelize from "sequelize";
import { NotFoundError } from "../../errors";
import auth from "../../middlewares/authentication";
import { Document, User, Event, Share, Team, Collection } from "../../models";
import policy from "../../policies";
import { presentShare, presentPolicies } from "../../presenters";
import pagination from "./middlewares/pagination";

const Op = Sequelize.Op;
const { authorize } = policy;
const router = new Router();

router.post("shares.info", auth(), async (ctx) => {
  const { id, documentId, apiVersion } = ctx.body;
  ctx.assertUuid(id || documentId, "id or documentId is required");

  const user = ctx.state.user;
  let shares = [];
  let share = await Share.scope({
    method: ["withCollection", user.id],
  }).findOne({
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

  // Deprecated API response returns just the share for the current documentId
  if (apiVersion !== 2) {
    if (!share || !share.document) {
      return (ctx.response.status = 204);
    }

    authorize(user, "read", share);

    ctx.body = {
      data: presentShare(share, user.isAdmin),
      policies: presentPolicies(user, [share]),
    };
    return;
  }

  // API version 2 returns the response for the current documentId and any
  // parent documents that are publicly shared and accessible to the user
  if (share && share.document) {
    authorize(user, "read", share);
    shares.push(share);
  }

  if (documentId) {
    const document = await Document.scope("withCollection").findByPk(
      documentId
    );
    const parentIds = document?.collection?.getDocumentParents(documentId);

    const parentShare = parentIds
      ? await Share.scope({
          method: ["withCollection", user.id],
        }).findOne({
          where: {
            documentId: parentIds,
            teamId: user.teamId,
            revokedAt: { [Op.eq]: null },
            includeChildDocuments: true,
            published: true,
          },
        })
      : undefined;

    if (parentShare && parentShare.document) {
      authorize(user, "read", parentShare);
      shares.push(parentShare);
    }
  }

  if (!shares.length) {
    return (ctx.response.status = 204);
  }

  ctx.body = {
    data: {
      shares: shares.map((share) => presentShare(share, user.isAdmin)),
    },
    policies: presentPolicies(user, shares),
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
        include: [
          {
            model: Collection.scope({
              method: ["withMembership", user.id],
            }),
            as: "collection",
          },
        ],
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
  const { id, includeChildDocuments, published } = ctx.body;
  ctx.assertUuid(id, "id is required");

  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId);
  authorize(user, "share", team);

  // fetch the share with document and collection.
  const share = await Share.scope({
    method: ["withCollection", user.id],
  }).findByPk(id);

  authorize(user, "update", share);

  if (published !== undefined) {
    share.published = published;

    // Reset nested document sharing when unpublishing a share link. So that
    // If it's ever re-published this doesn't immediately share nested docs
    // without forewarning the user
    if (!published) {
      share.includeChildDocuments = false;
    }
  }

  if (includeChildDocuments !== undefined) {
    share.includeChildDocuments = includeChildDocuments;
  }

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
  // user could be creating the share link to share with team members
  authorize(user, "read", document);

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
