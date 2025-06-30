import Router from "koa-router";
import isUndefined from "lodash/isUndefined";
import { FindOptions, Op, WhereOptions } from "sequelize";
import { TeamPreference } from "@shared/types";
import { loadShare } from "@server/commands/shareLoader";
import { NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Document, User, Share, Team, Collection } from "@server/models";
import { authorize, cannot } from "@server/policies";
import {
  presentShare,
  presentPolicies,
  presentPublicTeam,
  presentCollection,
  presentDocument,
} from "@server/presenters";
import { APIContext } from "@server/types";
import { getTeamFromContext } from "@server/utils/passport";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "shares.info",
  auth({ optional: true }),
  validate(T.SharesInfoSchema),
  async (ctx: APIContext<T.SharesInfoReq>) => {
    const { id, collectionId, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const teamFromCtx = await getTeamFromContext(ctx);

    const { share, parentShare, sharedTree, collection, document } =
      await loadShare({
        id,
        collectionId,
        documentId,
        user,
        teamId: teamFromCtx?.id,
      });
    const team = teamFromCtx?.id === share.teamId ? teamFromCtx : share.team;
    const shares = [share, parentShare].filter(Boolean) as Share[];

    if (!shares.length) {
      ctx.response.status = 204;
      return;
    }

    const isPublic = cannot(user, "read", document);
    const [serializedCollection, serializedDocument, serializedTeam] =
      await Promise.all([
        collection ? await presentCollection(ctx, collection) : null,
        document
          ? await presentDocument(ctx, document, {
              isPublic,
              shareId: share.id,
              includeUpdatedAt: share.showLastUpdated,
            })
          : null,
        presentPublicTeam(
          team,
          !!team.getPreference(TeamPreference.PublicBranding)
        ),
      ]);

    ctx.body = {
      data: {
        shares: shares.map((s) => presentShare(s, user?.isAdmin ?? false)),
        sharedTree,
        team: serializedTeam,
        collection: serializedCollection,
        document: serializedDocument,
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

    const collectionWhere: WhereOptions<Collection> = {
      teamId: user.teamId,
      id: collectionIds,
    };

    const documentWhere: WhereOptions<Document> = {
      teamId: user.teamId,
      collectionId: collectionIds,
    };

    if (query) {
      collectionWhere.name = {
        [Op.iLike]: `%${query}%`,
      };
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
          model: Collection.scope({
            method: ["withMembership", user.id],
          }),
          as: "collection",
          required: false,
          where: collectionWhere,
        },
        {
          model: Document,
          required: false,
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
    const {
      collectionId,
      documentId,
      published,
      urlId,
      includeChildDocuments,
      allowIndexing,
      showLastUpdated,
    } = ctx.input.body;
    const { user } = ctx.state.auth;
    authorize(user, "createShare", user.team);

    const collection = collectionId
      ? await Collection.findByPk(collectionId, {
          userId: user.id,
        })
      : null;
    const document = documentId
      ? await Document.findByPk(documentId, {
          userId: user.id,
        })
      : null;

    // user could be creating the share link to share with team members
    authorize(user, "read", document);

    if (published) {
      authorize(user, "share", user.team);
      authorize(user, "share", collectionId ? collection : document);
    }

    const [share] = await Share.findOrCreateWithCtx(ctx, {
      where: {
        collectionId,
        documentId,
        teamId: user.teamId,
        revokedAt: null,
      },
      defaults: {
        userId: user.id,
        published,
        includeChildDocuments,
        allowIndexing,
        showLastUpdated,
        urlId,
      },
    });

    share.team = user.team;
    share.user = user;
    share.collection = collection;
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
    const {
      id,
      includeChildDocuments,
      published,
      urlId,
      allowIndexing,
      showLastUpdated,
    } = ctx.input.body;

    const { user } = ctx.state.auth;
    authorize(user, "share", user.team);

    // fetch the share with document and collection.
    const share = await Share.scope({
      method: ["withCollectionPermissions", user.id],
    }).findByPk(id);

    authorize(user, "update", share);

    if (published !== undefined) {
      share.published = published;
      if (published && !!share.documentId) {
        share.includeChildDocuments = true;
      }
    }

    if (!!share.documentId && includeChildDocuments !== undefined) {
      share.includeChildDocuments = includeChildDocuments;
    }

    if (!isUndefined(urlId)) {
      share.urlId = urlId;
    }

    if (allowIndexing !== undefined) {
      share.allowIndexing = allowIndexing;
    }

    if (showLastUpdated !== undefined) {
      share.showLastUpdated = showLastUpdated;
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
