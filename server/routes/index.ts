import crypto from "crypto";
import path from "path";
import { formatRFC7231 } from "date-fns";
import Koa, { BaseContext } from "koa";
import Router from "koa-router";
import send from "koa-send";
import userAgent, { UserAgentContext } from "koa-useragent";
import { languages } from "@shared/i18n";
import { IntegrationType, TeamPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import { Day } from "@shared/utils/time";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import shareDomains from "@server/middlewares/shareDomains";
import { Integration } from "@server/models";
import { opensearchResponse } from "@server/utils/opensearch";
import { getTeamFromContext } from "@server/utils/passport";
import { robotsResponse } from "@server/utils/robots";
import apexRedirect from "../middlewares/apexRedirect";
import { renderApp, renderShare } from "./app";
import { renderEmbed } from "./embeds";
import errors from "./errors";

const koa = new Koa();
const router = new Router();

koa.use<BaseContext, UserAgentContext>(userAgent);

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
router.get("/s/:shareId/*", shareDomains(), renderShare);

router.get("/embeds/gitlab", renderEmbed);
router.get("/embeds/github", renderEmbed);
router.get("/embeds/dropbox", renderEmbed);
router.get("/embeds/pinterest", renderEmbed);

// catch all for application
router.get("*", shareDomains(), async (ctx, next) => {
  if (ctx.state?.rootShare) {
    return renderShare(ctx, next);
  }

  const team = await getTeamFromContext(ctx);

  if (env.isCloudHosted) {
    // Redirect all requests to custom domain if one is set
    if (team?.domain) {
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

  return renderApp(ctx, next, {
    analytics,
    shortcutIcon:
      team?.getPreference(TeamPreference.PublicBranding) && team.avatarUrl
        ? team.avatarUrl
        : undefined,
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
