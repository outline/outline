import dns from "node:dns";
import Router from "koa-router";
import { traceFunction } from "@server/logging/tracing";
import { MentionType, UnfurlResourceType } from "@shared/types";
import { getBaseDomain, parseDomain } from "@shared/utils/domains";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import parseMentionUrl from "@shared/utils/parseMentionUrl";
import { isInternalUrl } from "@shared/utils/urls";
import { NotFoundError, ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { Document, Share, Team, User, Group, GroupUser } from "@server/models";
import { authorize, can } from "@server/policies";
import presentUnfurl from "@server/presenters/unfurl";
import type { APIContext, Unfurl } from "@server/types";
import { CacheHelper, type CacheResult } from "@server/utils/CacheHelper";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import {
  checkEmbeddability,
  type EmbedCheckResult,
} from "@server/utils/embeds";
import * as T from "./schema";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import { Day } from "@shared/utils/time";

const router = new Router();
const plugins = PluginManager.getHooks(Hook.UnfurlProvider);

router.post(
  "urls.unfurl",
  rateLimiter(RateLimiterStrategy.OneThousandPerHour),
  auth(),
  validate(T.UrlsUnfurlSchema),
  async (ctx: APIContext<T.UrlsUnfurlReq>) => {
    const { url, documentId } = ctx.input.body;
    const { user: actor } = ctx.state.auth;
    const urlObj = new URL(url);

    // Mentions
    if (urlObj.protocol === "mention:") {
      if (!documentId) {
        throw ValidationError("Document ID is required to unfurl a mention");
      }
      const { modelId, mentionType } = parseMentionUrl(url);

      if (mentionType === MentionType.User) {
        const [user, document] = await Promise.all([
          User.findByPk(modelId),
          Document.findByPk(documentId, {
            userId: actor.id,
          }),
        ]);
        if (!user) {
          throw NotFoundError("Mentioned user does not exist");
        }
        if (!document) {
          throw NotFoundError("Document does not exist");
        }
        authorize(actor, "read", user);
        authorize(actor, "read", document);

        ctx.body = await presentUnfurl(
          {
            type: UnfurlResourceType.Mention,
            user,
            document,
          },
          { includeEmail: !!can(actor, "readEmail", user) }
        );
      } else if (mentionType === MentionType.Group) {
        const [group, document] = await Promise.all([
          Group.findByPk(modelId),
          Document.findByPk(documentId, {
            userId: actor.id,
          }),
        ]);
        if (!group) {
          throw NotFoundError("Mentioned group does not exist");
        }
        if (!document) {
          throw NotFoundError("Document does not exist");
        }
        authorize(actor, "read", group);
        authorize(actor, "read", document);

        // Get group members for display
        const groupUsers = await GroupUser.findAll({
          where: { groupId: group.id },
          include: [
            {
              model: User,
              as: "user",
            },
          ],
          limit: MAX_AVATAR_DISPLAY,
        });

        const users = groupUsers.map((gu) => gu.user).filter(Boolean);

        ctx.body = await presentUnfurl({
          type: UnfurlResourceType.Group,
          group,
          users,
        });
      }
      return;
    }

    // Internal resources
    if (isInternalUrl(url) || parseDomain(url).host === actor.team.domain) {
      const previewDocumentId = parseDocumentSlug(url);
      if (previewDocumentId) {
        const document = previewDocumentId
          ? await Document.findByPk(previewDocumentId, { userId: actor.id })
          : undefined;
        if (!document) {
          throw NotFoundError("Document does not exist");
        }
        authorize(actor, "read", document);

        ctx.body = await presentUnfurl({
          type: UnfurlResourceType.Document,
          document,
          viewer: actor,
        });
        return;
      }
      ctx.response.status = 204;
      return;
    }

    // External resources
    // Use getDataOrSet which handles distributed locking to prevent thundering herd
    // when multiple clients request the same URL simultaneously
    const cacheKey = RedisPrefixHelper.getUnfurlKey(actor.teamId, url);
    const defaultCacheExpiry = 3600;

    const unfurlResult = await CacheHelper.getDataOrSet<
      Unfurl | { error: true }
    >(
      cacheKey,
      async (): Promise<CacheResult<Unfurl | { error: true }> | undefined> => {
        for (const plugin of plugins) {
          const pluginName = plugin.name ?? "unknown";
          const unfurl = await traceFunction({
            spanName: "unfurl.plugin",
            resourceName: pluginName,
            tags: {
              "unfurl.plugin": pluginName,
              "unfurl.url_host": urlObj.hostname,
            },
          })(() => plugin.value.unfurl(url, actor))();
          if (unfurl) {
            if ("error" in unfurl) {
              return { data: { error: true as const }, expiry: 60 };
            }
            return {
              data: unfurl as Unfurl,
              expiry: plugin.value.cacheExpiry,
            };
          }
        }
        return undefined;
      },
      defaultCacheExpiry
    );

    if (!unfurlResult || "error" in unfurlResult) {
      ctx.response.status = 204;
      return;
    }

    ctx.body = await presentUnfurl(unfurlResult);
    return;
  }
);

router.post(
  "urls.checkEmbed",
  rateLimiter(RateLimiterStrategy.OneHundredPerHour),
  auth(),
  validate(T.UrlsCheckEmbedSchema),
  async (ctx: APIContext<T.UrlsCheckEmbedReq>) => {
    const { url } = ctx.input.body;

    const result = await CacheHelper.getDataOrSet<EmbedCheckResult>(
      RedisPrefixHelper.getEmbedCheckKey(url),
      () => checkEmbeddability(url),
      Day.seconds
    );

    ctx.body = result
      ? { embeddable: result.embeddable, reason: result.reason }
      : { embeddable: false, reason: "error" };
  }
);

router.post(
  "urls.validateCustomDomain",
  rateLimiter(RateLimiterStrategy.OneHundredPerHour),
  auth(),
  validate(T.UrlsCheckCnameSchema),
  async (ctx: APIContext<T.UrlsCheckCnameReq>) => {
    const { hostname } = ctx.input.body;

    const [team, share] = await Promise.all([
      Team.findOne({
        where: {
          domain: hostname,
        },
      }),
      Share.findOne({
        where: {
          domain: hostname,
        },
      }),
    ]);
    if (team || share) {
      throw ValidationError("Domain is already in use");
    }

    let addresses;
    try {
      addresses = await new Promise<string[]>((resolve, reject) => {
        dns.resolveCname(hostname, (err, res) => {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        });
      });
    } catch (err) {
      if (err.code === "ENOTFOUND") {
        throw NotFoundError("No CNAME record found");
      }

      throw ValidationError("Invalid domain");
    }

    if (addresses.length === 0) {
      throw ValidationError("No CNAME record found");
    }

    const address = addresses[0];
    const likelyValid = address.endsWith(getBaseDomain());

    if (!likelyValid) {
      throw ValidationError("CNAME is not configured correctly");
    }

    ctx.body = {
      success: true,
    };
  }
);

export default router;
