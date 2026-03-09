import crypto from "node:crypto";
import path from "node:path";
import { addHours } from "date-fns";
import { formatRFC7231 } from "date-fns";
import JWT from "jsonwebtoken";
import Koa from "koa";
import Router from "koa-router";
import send from "koa-send";
import { languages } from "@shared/i18n";
import { IntegrationType, TeamPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import { Day } from "@shared/utils/time";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import Logger from "@server/logging/Logger";
import shareDomains from "@server/middlewares/shareDomains";
import { Document, Integration, Share, User } from "@server/models";
import { opensearchResponse } from "@server/utils/opensearch";
import { getTeamFromContext } from "@server/utils/passport";
import { robotsResponse } from "@server/utils/robots";
import apexRedirect from "../middlewares/apexRedirect";
import { renderApp, renderShare } from "./app";
import { renderEmbed } from "./embeds";
import errors from "./errors";

const koa = new Koa();
const router = new Router();

// serve public assets
router.use(["/images/*", "/email/*", "/fonts/*"], async (ctx, next) => {
  let done;

  if (ctx.method === "HEAD" || ctx.method === "GET") {
    try {
      done = await send(ctx, ctx.path, {
        root: path.resolve(__dirname, "../../../public"),
        // 7 day expiry, these assets are mostly static but do not contain a hash
        maxAge: Day.ms * 7,
        setHeaders: (res) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
        },
      });
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
    }
  }

  if (!done) {
    await next();
  }
});

router.use(
  ["/share/:shareId", "/share/:shareId/doc/:documentSlug", "/share/:shareId/*"],
  (ctx) => {
    ctx.redirect(ctx.path.replace(/^\/share/, "/s"));
    ctx.status = 301;
  }
);

if (env.isProduction) {
  router.get("/static/*", async (ctx) => {
    try {
      const pathname = ctx.path.substring(8);
      if (!pathname) {
        throw NotFoundError();
      }

      await send(ctx, pathname, {
        root: path.join(__dirname, "../../app/"),
        // Hashed static assets get 1 year expiry plus immutable flag
        maxAge: Day.ms * 365,
        immutable: true,
        setHeaders: (res) => {
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Access-Control-Allow-Origin", "*");
        },
      });
    } catch (err) {
      if (err.status === 404) {
        // Serve a bad request instead of not found if the file doesn't exist
        // This prevents CDN's from caching the response, allowing them to continue
        // serving old file versions
        ctx.status = 400;
        return;
      }

      throw err;
    }
  });
}

router.get("/locales/:lng.json", async (ctx) => {
  const { lng } = ctx.params;

  if (!languages.includes(lng as (typeof languages)[number])) {
    ctx.status = 404;
    return;
  }

  await send(ctx, path.join(lng, "translation.json"), {
    setHeaders: (res, _, stats) => {
      res.setHeader("Last-Modified", formatRFC7231(stats.mtime));
      res.setHeader("Cache-Control", `public, max-age=${7 * Day.seconds}`);
      res.setHeader(
        "ETag",
        crypto.createHash("md5").update(stats.mtime.toISOString()).digest("hex")
      );
    },
    root: path.join(__dirname, "../../shared/i18n/locales"),
  });
});

router.get("/robots.txt", (ctx) => {
  ctx.body = robotsResponse();
});

router.get("/opensearch.xml", (ctx) => {
  ctx.type = "text/xml";
  ctx.response.set("Cache-Control", `public, max-age=${7 * Day.seconds}`);
  ctx.body = opensearchResponse(ctx.request.URL.origin);
});

router.get("/s/:shareId", shareDomains(), renderShare);
router.get("/s/:shareId/doc/:documentSlug", shareDomains(), renderShare);

/**
 * Guest Edit Token Redemption
 *
 * Validates a one-time token from a share's guest edit URL, sets an
 * authenticated session cookie for the ghost user, and redirects to the
 * document's edit page — all without requiring the visitor to have an account.
 *
 * Must be registered BEFORE /s/:shareId/* so it takes priority over the
 * catch-all share renderer.
 *
 * Flow:
 *   GET /s/:shareId/edit?token=<guestEditToken>
 *     → validate token against share
 *     → set "accessToken" cookie (8h JWT for ghost user)
 *     → redirect to /doc/:urlId
 */
router.get("/s/:shareId/edit", async (ctx) => {
  const { shareId } = ctx.params;
  const token = ctx.query.token as string | undefined;
  const fallbackUrl = `/s/${shareId}`;

  try {
    if (!token) {
      ctx.redirect(fallbackUrl);
      return;
    }

    // Look up by urlId — share canonical URLs use the human-readable urlId
    // (e.g. /s/my-document), not the UUID primary key.
    const share = await Share.findOne({
      where: { urlId: shareId, revokedAt: null },
      include: [{ association: "team", required: true }],
    });

    if (
      !share ||
      !share.allowGuestEdit ||
      !share.guestEditToken ||
      share.guestEditToken !== token
    ) {
      // Token missing, invalid, or guest editing not enabled — fall back to read-only view.
      ctx.redirect(fallbackUrl);
      return;
    }

    if (!share.ghostUserId) {
      ctx.redirect(fallbackUrl);
      return;
    }

    const ghostUser = await User.findByPk(share.ghostUserId);
    if (!ghostUser || ghostUser.suspendedAt) {
      // Guest editing has been revoked.
      ctx.redirect(fallbackUrl);
      return;
    }

    const document = share.documentId
      ? await Document.findByPk(share.documentId)
      : null;

    if (!document) {
      ctx.redirect(fallbackUrl);
      return;
    }

    // Generate an 8-hour session JWT for the ghost user.
    // The payload format matches Outline's existing session token structure.
    const expiresAt = addHours(new Date(), 8);
    const sessionToken = JWT.sign(
      {
        id: ghostUser.id,
        type: "session",
        expiresAt: expiresAt.toISOString(),
      },
      ghostUser.jwtSecret
    );

    // Set the cookie that Outline's auth middleware reads on subsequent requests.
    const isHttps = env.URL.startsWith("https");
    ctx.cookies.set("accessToken", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      expires: expiresAt,
      secure: isHttps,
    });

    // Redirect to the actual document (the authenticated app route).
    ctx.redirect(document.url);
  } catch (err) {
    Logger.error("Guest edit token redemption failed", err, { shareId });
    ctx.redirect(fallbackUrl);
  }
});

router.get("/s/:shareId/*", shareDomains(), renderShare);

router.get("/embeds/gitlab", renderEmbed);
router.get("/embeds/github", renderEmbed);
router.get("/embeds/dropbox", renderEmbed);
router.get("/embeds/pinterest", renderEmbed);

router.use(shareDomains());

router.get("/doc/:documentSlug", async (ctx, next) => {
  if (ctx.state?.rootShare) {
    return renderShare(ctx, next);
  }
  return next();
});

router.get("/sitemap.xml", async (ctx) => {
  if (ctx.state?.rootShare) {
    ctx.redirect(`/api/shares.sitemap?id=${ctx.state?.rootShare.id}`);
  } else {
    ctx.status = 404;
  }
});

// catch all for application
router.get("*", async (ctx, next) => {
  if (ctx.state?.rootShare) {
    // Only allow root path for root share domains, return 404 for other paths.
    // Valid paths like /doc/:documentSlug and /sitemap.xml are handled above.
    if (ctx.path !== "/") {
      ctx.status = 404;
      return;
    }
    return renderShare(ctx, next);
  }

  const team = await getTeamFromContext(ctx);

  if (env.isCloudHosted) {
    // Redirect to main domain if no team is found
    if (!team || team.isSuspended) {
      if (env.isProduction && ctx.hostname !== parseDomain(env.URL).host) {
        ctx.redirect(env.URL);
        return;
      }
    }

    // Redirect all requests to custom domain if one is set
    else if (team?.domain) {
      if (team.domain !== ctx.hostname) {
        ctx.redirect(ctx.href.replace(ctx.hostname, team.domain));
        return;
      }
    }

    // Redirect if subdomain is not the current team's subdomain
    else if (team?.subdomain) {
      const { teamSubdomain } = parseDomain(ctx.href);
      if (team?.subdomain !== teamSubdomain) {
        ctx.redirect(
          ctx.href.replace(`//${teamSubdomain}.`, `//${team.subdomain}.`)
        );
        return;
      }
    }
  }

  const analytics = team
    ? await Integration.findAll({
        where: {
          teamId: team.id,
          type: IntegrationType.Analytics,
        },
      })
    : [];

  const publicBranding =
    team?.getPreference(TeamPreference.PublicBranding) ?? false;

  return renderApp(ctx, next, {
    title: publicBranding && team?.name ? team.name : undefined,
    description:
      publicBranding && team?.description ? team.description : undefined,
    analytics,
    shortcutIcon:
      publicBranding && team?.avatarUrl ? team.avatarUrl : undefined,
  });
});

// In order to report all possible performance metrics to Sentry this header
// must be provided when serving the application, see:
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Timing-Allow-Origin
const timingOrigins = [env.URL];

if (env.SENTRY_DSN) {
  timingOrigins.push("https://sentry.io");
}

koa.use(async (ctx, next) => {
  ctx.set("Timing-Allow-Origin", timingOrigins.join(", "));
  await next();
});

koa.use(apexRedirect());
if (env.ENVIRONMENT === "test") {
  koa.use(errors.routes());
}

koa.use(router.routes());

export default koa;
