import dns from "dns";
import Router from "koa-router";
import { MentionType, UnfurlResourceType } from "@shared/types";
import { getBaseDomain, parseDomain } from "@shared/utils/domains";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import parseMentionUrl from "@shared/utils/parseMentionUrl";
import { isInternalUrl } from "@shared/utils/urls";
import { NotFoundError, ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { Document, Share, Team, User } from "@server/models";
import { authorize, can } from "@server/policies";
import presentUnfurl from "@server/presenters/unfurl";
import { APIContext, Unfurl } from "@server/types";
import { CacheHelper } from "@server/utils/CacheHelper";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";

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

      // TODO: Add support for other mention types
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
      return (ctx.response.status = 204);
    }

    // External resources
    const cachedData = await CacheHelper.getData<Unfurl>(
      CacheHelper.getUnfurlKey(actor.teamId, url)
    );
    if (cachedData) {
      return (ctx.body = await presentUnfurl(cachedData));
    }

    for (const plugin of plugins) {
      const data = await plugin.value.unfurl(url, actor);
      if (data) {
        if ("error" in data) {
          return (ctx.response.status = 204);
        } else {
          await CacheHelper.setData(
            CacheHelper.getUnfurlKey(actor.teamId, url),
            data,
            plugin.value.cacheExpiry
          );
          return (ctx.body = await presentUnfurl(data));
        }
      }
    }

    return (ctx.response.status = 204);
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
