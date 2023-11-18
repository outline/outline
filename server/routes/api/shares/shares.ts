import Router from "koa-router";
import isUndefined from "lodash/isUndefined";
import { Op, WhereOptions } from "sequelize";
import { NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Document, User, Event, Share, Team, Collection } from "@server/models";
import { authorize } from "@server/policies";
import { presentShare, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "shares.info",
  auth(),
  validate(T.SharesInfoSchema),
  async (ctx: APIContext<T.SharesInfoReq>) => {
    const { id, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;
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
  }
);

router.post(
  "shares.list",
  auth(),
  pagination(),
  validate(T.SharesListSchema),
  async (ctx: APIContext<T.SharesListReq>) => {
    const { sort, direction } = ctx.input.body;
    const { user } = ctx.state.auth;
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
  }
);

router.post(
  "shares.create",
  auth(),
  validate(T.SharesCreateSchema),
  async (ctx: APIContext<T.SharesCreateReq>) => {
    const { documentId, published, urlId, includeChildDocuments } =
      ctx.input.body;
    const { user } = ctx.state.auth;
    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });

    // user could be creating the share link to share with team members
    authorize(user, "read", document);

    if (published) {
      authorize(user, "share", user.team);
      authorize(user, "share", document);
    }

    const [share, isCreated] = await Share.findOrCreate({
      where: {
        documentId,
        teamId: user.teamId,
        revokedAt: null,
      },
      defaults: {
        userId: user.id,
        published,
        includeChildDocuments,
        urlId,
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
          published,
          includeChildDocuments,
          urlId,
        },
        ip: ctx.request.ip,
      });
    }

    share.team = user.team;
    share.user = user;
    share.document = document;

    ctx.body = {
      data: presentShare(share),
      policies: presentPolicies(user, [share]),
    };
  }
);

router.post(
  "shares.update",
  auth(),
  validate(T.SharesUpdateSchema),
  async (ctx: APIContext<T.SharesUpdateReq>) => {
    const { id, includeChildDocuments, published, urlId } = ctx.input.body;

    const { user } = ctx.state.auth;
    authorize(user, "share", user.team);

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

    if (!isUndefined(urlId)) {
      share.urlId = urlId;
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
  }
);

router.post(
  "shares.revoke",
  auth(),
  validate(T.SharesRevokeSchema),
  async (ctx: APIContext<T.SharesRevokeReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
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
  }
);

export default router;
