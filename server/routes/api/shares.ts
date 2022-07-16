import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import { NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { Document, User, Event, Share, Team, Collection } from "@server/models";
import { authorize } from "@server/policies";
import { presentShare, presentPolicies } from "@server/presenters";
import { assertUuid, assertSort, assertPresent } from "@server/validation";
import pagination from "./middlewares/pagination";

const router = new Router();

router.post("shares.info", auth(), async (ctx) => {
  const { id, documentId } = ctx.body;
  assertPresent(id || documentId, "id or documentId is required");
  if (id) {
    assertUuid(id, "id is must be a uuid");
  }
  if (documentId) {
    assertUuid(documentId, "documentId is must be a uuid");
  }

  const { user } = ctx.state;
  const shares = [];
  const share = await Share.scope({
    method: ["withCollectionPermissions", user.id],
  }).findOne({
    where: id
      ? {
          id,
          revokedAt: {
            [Op.is]: null,
          },
        }
      : {
          documentId,
          teamId: user.teamId,
          revokedAt: {
            [Op.is]: null,
          },
        },
  });

  // We return the response for the current documentId and any parent documents
  // that are publicly shared and accessible to the user
  if (share && share.document) {
    authorize(user, "read", share);
    shares.push(share);
  }

  if (documentId) {
    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });
    authorize(user, "read", document);

    const collection = await document.$get("collection");
    const parentIds = collection?.getDocumentParents(documentId);
    const parentShare = parentIds
      ? await Share.scope({
          method: ["withCollectionPermissions", user.id],
        }).findOne({
          where: {
            documentId: parentIds,
            teamId: user.teamId,
            revokedAt: {
              [Op.is]: null,
            },
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
    ctx.response.status = 204;
    return;
  }

  ctx.body = {
    data: {
      shares: shares.map((share) => presentShare(share, user.isAdmin)),
    },
    policies: presentPolicies(user, shares),
  };
});

router.post("shares.list", auth(), pagination(), async (ctx) => {
  let { direction } = ctx.body;
  const { sort = "updatedAt" } = ctx.body;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  assertSort(sort, Share);

  const { user } = ctx.state;
  const where: WhereOptions<Share> = {
    teamId: user.teamId,
    userId: user.id,
    published: true,
    revokedAt: {
      [Op.is]: null,
    },
  };

  if (user.isAdmin) {
    delete where.userId;
  }

  const collectionIds = await user.collectionIds();

  const [shares, total] = await Promise.all([
    Share.findAll({
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
    }),
    Share.count({ where }),
  ]);

  ctx.body = {
    pagination: { ...ctx.state.pagination, total },
    data: shares.map((share) => presentShare(share, user.isAdmin)),
    policies: presentPolicies(user, shares),
  };
});

router.post("shares.update", auth(), async (ctx) => {
  const { id, includeChildDocuments, published } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const team = await Team.findByPk(user.teamId);
  authorize(user, "share", team);

  // fetch the share with document and collection.
  const share = await Share.scope({
    method: ["withCollectionPermissions", user.id],
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
    data: {
      published,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentShare(share, user.isAdmin),
    policies: presentPolicies(user, [share]),
  };
});

router.post("shares.create", auth(), async (ctx) => {
  const { documentId } = ctx.body;
  assertPresent(documentId, "documentId is required");

  const { user } = ctx.state;
  const document = await Document.findByPk(documentId, {
    userId: user.id,
  });

  // user could be creating the share link to share with team members
  authorize(user, "read", document);

  const team = await Team.findByPk(user.teamId);

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
      data: {
        name: document.title,
      },
      ip: ctx.request.ip,
    });
  }

  if (team) {
    share.team = team;
  }
  share.user = user;
  share.document = document;

  ctx.body = {
    data: presentShare(share),
    policies: presentPolicies(user, [share]),
  };
});

router.post("shares.revoke", auth(), async (ctx) => {
  const { id } = ctx.body;
  assertUuid(id, "id is required");

  const { user } = ctx.state;
  const share = await Share.findByPk(id);

  if (!share?.document) {
    throw NotFoundError();
  }

  authorize(user, "revoke", share);
  const { document } = share;

  await share.revoke(user.id);
  await Event.create({
    name: "shares.revoke",
    documentId: document.id,
    collectionId: document.collectionId,
    modelId: share.id,
    teamId: user.teamId,
    actorId: user.id,
    data: {
      name: document.title,
    },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
