import crypto from "node:crypto";
import path from "node:path";
import { formatRFC7231 } from "date-fns";
import Koa from "koa";
import Router from "koa-router";
import send from "koa-send";
import { languages } from "@shared/i18n";
import { TeamPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import { Day } from "@shared/utils/time";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import shareDomains from "@server/middlewares/shareDomains";
import { Integration } from "@server/models";
import { getTeamFromContext } from "@server/utils/passport";
import { isInvalidAppPath } from "@server/utils/url";
import apexRedirect from "../middlewares/apexRedirect";
import { renderApp, renderShare } from "./app";
import discovery from "./discovery";
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
      if (!(err instanceof Error && "status" in err && err.status === 404)) {
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
    const redirectPath = ctx.path.replace(/^\/share/, "/s");
    ctx.redirect(redirectPath + ctx.request.URL.search);
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
        setHeaders: (res, filePath) => {
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Access-Control-Allow-Origin", "*");

          // The service worker is not hashed and must always be revalidated
          // so that browsers detect and install new versions.
          if (path.basename(filePath) === "sw.js") {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      });
    } catch (err) {
      if (err instanceof Error && "status" in err && err.status === 404) {
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
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
    root: path.join(__dirname, "../../shared/i18n/locales"),
  });
});

router.use(discovery.routes());

router.get("/s/:shareId.:format", shareDomains(), renderShare);
router.get("/s/:shareId", shareDomains(), renderShare);
router.get(
  "/s/:shareId/doc/:documentSlug.:format",
  shareDomains(),
  renderShare
);
router.get("/s/:shareId/doc/:documentSlug", shareDomains(), renderShare);
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
  if (isInvalidAppPath(ctx.path)) {
    ctx.status = 404;
    return;
  }

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

    // Redirect to the team's canonical url, taking into account custom domains
    // and hosted subdomains, if the request arrived on a different host.
    else if (team && !team.isTeamUrl(ctx.href)) {
      const url = new URL(team.url);
      url.pathname = ctx.path;
      url.search = ctx.search;
      ctx.redirect(url.toString());
      return;
    }
  }

  const analytics = await Integration.findAnalyticsIntegrationsForTeam(
    team?.id
  );

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
