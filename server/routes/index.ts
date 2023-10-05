import crypto from "crypto";
import path from "path";
import formatRFC7231 from "date-fns/formatRFC7231";
import Koa, { BaseContext } from "koa";
import compress from "koa-compress";
import Router from "koa-router";
import send from "koa-send";
import userAgent, { UserAgentContext } from "koa-useragent";
import { languages } from "@shared/i18n";
import { IntegrationType } from "@shared/types";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import { Integration } from "@server/models";
import { opensearchResponse } from "@server/utils/opensearch";
import { getTeamFromContext } from "@server/utils/passport";
import { robotsResponse } from "@server/utils/robots";
import apexRedirect from "../middlewares/apexRedirect";
import { renderApp, renderShare } from "./app";
import errors from "./errors";

const isProduction = env.ENVIRONMENT === "production";
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
        maxAge: 7 * 24 * 60 * 60 * 1000,
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

if (isProduction) {
  router.get("/static/*", async (ctx) => {
    try {
      const pathname = ctx.path.substring(8);
      if (!pathname) {
        throw NotFoundError();
      }

      await send(ctx, pathname, {
        root: path.join(__dirname, "../../app/"),
        // Hashed static assets get 1 year expiry plus immutable flag
        maxAge: 365 * 24 * 60 * 60 * 1000,
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

router.use(compress());

router.get("/locales/:lng.json", async (ctx) => {
  const { lng } = ctx.params;

  if (!languages.includes(lng)) {
    ctx.status = 404;
    return;
  }

  await send(ctx, path.join(lng, "translation.json"), {
    setHeaders: (res, _, stats) => {
      res.setHeader("Last-Modified", formatRFC7231(stats.mtime));
      res.setHeader("Cache-Control", `public, max-age=${7 * 24 * 60 * 60}`);
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

  ctx.body = opensearchResponse(ctx.request.URL.origin);
});

router.get("/s/:shareId", renderShare);
router.get("/s/:shareId/doc/:documentSlug", renderShare);
router.get("/s/:shareId/*", renderShare);

// catch all for application
router.get("*", async (ctx, next) => {
  const team = await getTeamFromContext(ctx);
  const analytics = team
    ? await Integration.findOne({
        where: {
          teamId: team.id,
          type: IntegrationType.Analytics,
        },
      })
    : undefined;

  // Redirect all requests to custom domain if one is set
  if (team?.domain && team.domain !== ctx.hostname) {
    ctx.redirect(ctx.href.replace(ctx.hostname, team.domain));
    return;
  }

  return renderApp(ctx, next, {
    analytics,
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
