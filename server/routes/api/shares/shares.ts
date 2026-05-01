import Router from "koa-router";
import isUndefined from "lodash/isUndefined";
import type { FindOptions, WhereAttributeHash, WhereOptions } from "sequelize";
import { Op } from "sequelize";
import { subMinutes } from "date-fns";
import { randomString } from "@shared/random";
import { QueryNotices, TeamPreference } from "@shared/types";
import {
  AuthenticationError,
  InvalidRequestError,
  NotFoundError,
} from "@server/errors";
import ShareSubscriptionConfirmEmail from "@server/emails/templates/ShareSubscriptionConfirmEmail";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import {
  Document,
  User,
  Share,
  Team,
  Collection,
  ShareSubscription,
} from "@server/models";
import ShareSubscriptionHelper from "@server/models/helpers/ShareSubscriptionHelper";
import { authorize, cannot } from "@server/policies";
import {
  presentShare,
  presentPolicies,
  presentPublicTeam,
  presentCollection,
  presentDocument,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { getTeamFromContext } from "@server/utils/passport";
import { navigationNodeToSitemap } from "@server/utils/sitemap";
import pagination from "../middlewares/pagination";
import * as T from "./schema";
import {
  loadPublicShare,
  loadShareWithParent,
} from "@server/commands/shareLoader";
import shareDomains from "@server/middlewares/shareDomains";
import env from "@server/env";
import { safeEqual } from "@server/utils/crypto";

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
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
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
      allowSubscriptions,
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

    if (documentId && !document) {
      throw NotFoundError();
    }
    if (collectionId && !collection) {
      throw NotFoundError();
    }

    if (document) {
      authorize(user, "read", document);
    }
    if (collection) {
      authorize(user, "read", collection);
    }

    if (published) {
      authorize(user, "share", user.team);
      if (document) {
        authorize(user, "share", document);
      }
      if (collection) {
        authorize(user, "share", collection);
      }
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
        includeChildDocuments: published || includeChildDocuments,
        allowIndexing,
        allowSubscriptions,
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
      allowSubscriptions,
      showLastUpdated,
      showTOC,
      title,
      iconUrl,
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
    if (allowSubscriptions !== undefined) {
      share.allowSubscriptions = allowSubscriptions;
    }
    if (showLastUpdated !== undefined) {
      share.showLastUpdated = showLastUpdated;
    }
    if (showTOC !== undefined) {
      share.showTOC = showTOC;
    }

    if (!isUndefined(title)) {
      share.title = title || null;
    }

    if (!isUndefined(iconUrl)) {
      share.iconUrl = iconUrl || null;
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
  shareDomains(),
  validate(T.SharesSitemapSchema),
  async (ctx: APIContext<T.SharesSitemapReq>) => {
    const { id } = ctx.input.query;
    const team = await getTeamFromContext(ctx, { includeStateCookie: false });

    const { share, sharedTree } = await loadPublicShare({
      id,
      teamId: team?.id,
    });

    if (!share.allowIndexing) {
      ctx.status = 404;
      return;
    }

    const baseUrl = share.domain
      ? `https://${share.domain}`
      : `${share.team.url ?? process.env.URL}/s/${id}`;

    ctx.set("Content-Type", "application/xml");
    ctx.body = navigationNodeToSitemap(sharedTree, baseUrl);
  }
);

router.post(
  "shares.subscribe",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.SharesSubscribeSchema),
  transaction(),
  async (ctx: APIContext<T.SharesSubscribeReq>) => {
    if (!env.EMAIL_ENABLED) {
      throw InvalidRequestError("Email is not configured");
    }

    const { shareId, documentId, email } = ctx.input.body;
    const { transaction } = ctx.state;
    const team = await getTeamFromContext(ctx, { includeStateCookie: false });

    // Validate the share exists and is published
    const { share, document } = await loadPublicShare({
      id: shareId,
      documentId,
      teamId: team?.id,
    });

    if (!share.allowSubscriptions) {
      throw InvalidRequestError("Subscriptions are not enabled for this share");
    }

    const emailFingerprint = ShareSubscription.normalizeEmailFingerprint(email);

    const existing = await ShareSubscription.findOne({
      where: { shareId: share.id, documentId, emailFingerprint },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    let subscription: ShareSubscription;

    if (existing) {
      // Already confirmed and active — return success silently
      if (existing.isConfirmed && !existing.isUnsubscribed) {
        ctx.body = { success: true };
        return;
      }

      // Unsubscribed — allow re-subscribe with new confirmation
      if (existing.isUnsubscribed) {
        existing.unsubscribedAt = null;
        existing.confirmedAt = null;
        existing.lastNotifiedAt = null;
        existing.secret = randomString(32);
        existing.email = email;
        await existing.save({ transaction });
      } else if (existing.createdAt > subMinutes(new Date(), 60)) {
        // Recently created, not yet confirmed — don't spam
        ctx.body = { success: true };
        return;
      } else {
        // Expired or stale unconfirmed — regenerate
        existing.secret = randomString(32);
        existing.email = email;
        await existing.save({ transaction });
      }

      subscription = existing;
    } else {
      subscription = await ShareSubscription.create(
        {
          shareId: share.id,
          documentId,
          email,
          emailFingerprint,
          secret: randomString(32),
          ipAddress: ctx.request.ip,
        },
        { transaction }
      );
    }

    const confirmUrl = ShareSubscriptionHelper.confirmUrl(subscription);
    const usePublicBranding =
      share.team?.getPreference(TeamPreference.PublicBranding) ?? false;
    await new ShareSubscriptionConfirmEmail({
      to: email,
      documentTitle: document?.titleWithDefault ?? "",
      confirmUrl,
      teamName: usePublicBranding ? share.team?.name : undefined,
    }).schedule();

    ctx.body = { success: true };
  }
);

router.get(
  "shares.confirmSubscription",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  validate(T.SharesConfirmSubscriptionSchema),
  transaction(),
  async (ctx: APIContext<T.SharesConfirmSubscriptionReq>) => {
    const { id, token, follow } = ctx.input.query;
    const { transaction } = ctx.state;

    // Anti-prefetch: prevent email clients from pre-fetching the link
    if (!follow) {
      return ctx.redirectOnClient(ctx.request.href + "&follow=true");
    }

    const subscription = await ShareSubscription.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!subscription || subscription.isUnsubscribed) {
      ctx.redirect(`${env.URL}?notice=invalid-auth`);
      return;
    }

    const share = await Share.findByPk(subscription.shareId);

    if (!share?.allowSubscriptions) {
      ctx.redirect(`${env.URL}?notice=invalid-auth`);
      return;
    }

    const expectedToken = ShareSubscription.generateConfirmToken(subscription);

    if (!safeEqual(token, expectedToken)) {
      ctx.redirect(`${env.URL}?notice=invalid-auth`);
      return;
    }

    if (subscription.isTokenExpired && !subscription.isConfirmed) {
      ctx.redirect(`${env.URL}?notice=expired-token`);
      return;
    }

    subscription.confirmedAt = new Date();
    await subscription.save({ transaction });

    let redirectUrl = share?.canonicalUrl ?? env.URL;

    if (
      subscription.documentId &&
      subscription.documentId !== share.documentId
    ) {
      const doc = await Document.findByPk(subscription.documentId);
      if (doc?.path) {
        redirectUrl = `${redirectUrl.replace(/\/$/, "")}${doc.path}`;
      }
    }

    ctx.redirect(`${redirectUrl}?notice=${QueryNotices.Subscribed}`);
  }
);

router.get(
  "shares.unsubscribe",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  validate(T.SharesUnsubscribeSchema),
  transaction(),
  async (ctx: APIContext<T.SharesUnsubscribeReq>) => {
    const { id, token, follow } = ctx.input.query;
    const { transaction } = ctx.state;

    // Anti-prefetch: prevent email clients from pre-fetching the link
    if (!follow) {
      return ctx.redirectOnClient(ctx.request.href + "&follow=true");
    }

    const subscription = await ShareSubscription.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!subscription) {
      ctx.redirect(`${env.URL}?notice=invalid-auth`);
      return;
    }

    const expectedToken =
      ShareSubscription.generateUnsubscribeToken(subscription);

    if (!safeEqual(token, expectedToken)) {
      ctx.redirect(`${env.URL}?notice=invalid-auth`);
      return;
    }

    subscription.unsubscribedAt = new Date();
    await subscription.save({ transaction });

    const share = await Share.findByPk(subscription.shareId);
    const shareUrl = share?.canonicalUrl ?? env.URL;
    ctx.redirect(`${shareUrl}?notice=${QueryNotices.Unsubscribed}`);
  }
);

export default router;
