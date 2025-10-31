import Router from "koa-router";
import isUndefined from "lodash/isUndefined";
import { FindOptions, Op, WhereAttributeHash, WhereOptions } from "sequelize";
import { TeamPreference } from "@shared/types";
import { AuthenticationError, NotFoundError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
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
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { getTeamFromContext } from "@server/utils/passport";
import { navigationNodeToSitemap } from "@server/utils/sitemap";
import pagination from "../middlewares/pagination";
import * as T from "./schema";
import {
  loadPublicShare,
  loadShareWithParent,
} from "@server/commands/shareLoader";

const router = new Router();

router.post(
  "shares.info",
  auth({ optional: true }),
  validate(T.SharesInfoSchema),
  async (ctx: APIContext<T.SharesInfoReq>) => {
    const { id, collectionId, documentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const teamFromCtx = await getTeamFromContext(ctx, {
      includeStateCookie: false,
    });

    // only public link loads will send "id".
    if (id) {
      let { share, sharedTree, collection, document } = await loadPublicShare({
        id,
        collectionId,
        documentId,
        teamId: teamFromCtx?.id,
      });

      // reload with membership scope if user is authenticated
      if (user) {
        collection = collection
          ? await Collection.findByPk(collection.id, { userId: user.id })
          : null;
        document = document
          ? await Document.findByPk(document.id, { userId: user.id })
          : null;
      }

      const team = teamFromCtx?.id === share.teamId ? teamFromCtx : share.team;

      const [serializedCollection, serializedDocument, serializedTeam] =
        await Promise.all([
          collection
            ? await presentCollection(ctx, collection, {
                isPublic: cannot(user, "read", collection),
                shareId: share.id,
                includeUpdatedAt: share.showLastUpdated,
              })
            : null,
          document
            ? await presentDocument(ctx, document, {
                isPublic: cannot(user, "read", document),
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
          shares: [presentShare(share, user?.isAdmin ?? false)],
          sharedTree,
          team: serializedTeam,
          collection: serializedCollection,
          document: serializedDocument,
        },
        policies: presentPolicies(user, [share]),
      };
      return;
    }

    // load share with parent for displaying in the share popovers.

    if (!user) {
      throw AuthenticationError("Authentication required");
    }

    try {
      const { share, parentShare } = await loadShareWithParent({
        collectionId,
        documentId,
        user,
      });

      const shares = [share, parentShare].filter(Boolean) as Share[];
      if (!shares.length) {
        throw NotFoundError();
      }

      ctx.body = {
        data: {
          shares: shares.map((s) => presentShare(s, user.isAdmin ?? false)),
        },
        policies: presentPolicies(user, shares),
      };
    } catch (err) {
      if (err.id === "not_found") {
        ctx.response.status = 204;
        return;
      }
      throw err;
    }
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

    const collectionWhere: WhereAttributeHash<Share> = {
      "$collection.id$": collectionIds,
      "$collection.teamId$": user.teamId,
    };

    const documentWhere: WhereAttributeHash<Share> = {
      "$document.teamId$": user.teamId,
      "$document.collectionId$": collectionIds,
    };

    if (query) {
      collectionWhere["$collection.name$"] = { [Op.iLike]: `%${query}%` };
      documentWhere["$document.title$"] = {
        [Op.iLike]: `%${query}%`,
      };
    }

    const shareWhere: WhereOptions<Share> = {
      teamId: user.teamId,
      userId: user.id,
      published: true,
      revokedAt: {
        [Op.is]: null,
      },
    };

    if (user.isAdmin) {
      delete shareWhere.userId;
    }

    const options: FindOptions = {
      where: {
        ...shareWhere,
        [Op.or]: [collectionWhere, documentWhere],
      },
      include: [
        {
          model: Collection.scope({
            method: ["withMembership", user.id],
          }),
          as: "collection",
          required: false,
        },
        {
          model: Document,
          required: false,
          paranoid: true,
          as: "document",
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
      subQuery: false,
    };

    const [shares, total] = await Promise.all([
      Share.unscoped().findAll({
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
      showTOC,
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
    authorize(user, "read", collectionId ? collection : document);

    if (published) {
      authorize(user, "share", user.team);
      authorize(user, "share", collectionId ? collection : document);
    }

    const [share] = await Share.findOrCreateWithCtx(ctx, {
      where: {
        collectionId: collectionId ?? null,
        documentId: documentId ?? null,
        teamId: user.teamId,
        revokedAt: null,
      },
      defaults: {
        userId: user.id,
        published,
        includeChildDocuments,
        allowIndexing,
        showLastUpdated,
        showTOC,
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
      showTOC,
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
    if (showLastUpdated !== undefined) {
      share.showLastUpdated = showLastUpdated;
    }
    if (showTOC !== undefined) {
      share.showTOC = showTOC;
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

    if (!share?.collection && !share?.document) {
      throw NotFoundError();
    }

    authorize(user, "revoke", share);

    await share.revoke(ctx);

    ctx.body = {
      success: true,
    };
  }
);

router.get(
  "shares.sitemap",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  validate(T.SharesSitemapSchema),
  async (ctx: APIContext<T.SharesSitemapReq>) => {
    const { id } = ctx.input.query;
    const team = await getTeamFromContext(ctx, { includeStateCookie: false });

    const { share, sharedTree } = await loadPublicShare({
      id,
      teamId: team?.id,
    });

    const baseUrl = `${process.env.URL}/s/${id}`;

    ctx.set("Content-Type", "application/xml");
    ctx.body = navigationNodeToSitemap(
      share.allowIndexing ? sharedTree : undefined,
      baseUrl
    );
  }
);

export default router;
