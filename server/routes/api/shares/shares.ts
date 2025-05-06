import Router from "koa-router";
import isUndefined from "lodash/isUndefined";
import { FindOptions, Op, WhereOptions } from "sequelize";
import { NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, User, Share, Team, Collection } from "@server/models";
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

      const collection = document.collectionId
        ? await Collection.scope("withDocumentStructure").findByPk(
            document.collectionId
          )
        : undefined;
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
    const { sort, direction, query } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "listShares", user.team);
    const collectionIds = await user.collectionIds();

    const where: WhereOptions<Share> = {
      teamId: user.teamId,
      userId: user.id,
      published: true,
      revokedAt: {
        [Op.is]: null,
      },
    };

    const documentWhere: WhereOptions<Document> = {
      teamId: user.teamId,
      collectionId: collectionIds,
    };

    if (query) {
      documentWhere.title = {
        [Op.iLike]: `%${query}%`,
      };
    }

    if (user.isAdmin) {
      delete where.userId;
    }

    const options: FindOptions = {
      where,
      include: [
        {
          model: Document,
          required: true,
          paranoid: true,
          as: "document",
          where: documentWhere,
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
    };

    const [shares, total] = await Promise.all([
      Share.findAll({
        ...options,
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Share.count(options),
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
  transaction(),
  async (ctx: APIContext<T.SharesCreateReq>) => {
    const { documentId, published, urlId, includeChildDocuments } =
      ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "createShare", user.team);

    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });

    // user could be creating the share link to share with team members
    authorize(user, "read", document);

    if (published) {
      authorize(user, "share", user.team);
      authorize(user, "share", document);
    }

    const [share] = await Share.findOrCreateWithCtx(ctx, {
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
  transaction(),
  async (ctx: APIContext<T.SharesUpdateReq>) => {
    const { id, includeChildDocuments, published, urlId, allowIndexing } =
      ctx.input.body;

    const { user } = ctx.state.auth;
    authorize(user, "share", user.team);

    // fetch the share with document and collection.
    const share = await Share.scope({
      method: ["withCollectionPermissions", user.id],
    }).findByPk(id);

    authorize(user, "update", share);

    if (published !== undefined) {
      share.published = published;
      if (published) {
        share.includeChildDocuments = true;
      }
    }

    if (includeChildDocuments !== undefined) {
      share.includeChildDocuments = includeChildDocuments;
    }

    if (!isUndefined(urlId)) {
      share.urlId = urlId;
    }

    if (allowIndexing !== undefined) {
      share.allowIndexing = allowIndexing;
    }

    await share.saveWithCtx(ctx);

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
  transaction(),
  async (ctx: APIContext<T.SharesRevokeReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const share = await Share.findByPk(id);

    if (!share?.document) {
      throw NotFoundError();
    }

    authorize(user, "revoke", share);

    await share.revoke(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
