import path from "path";
import Koa from "koa";
import Router from "koa-router";
import send from "koa-send";
import serve from "koa-static";
import { languages } from "@shared/i18n";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import { opensearchResponse } from "@server/utils/opensearch";
import { robotsResponse } from "@server/utils/robots";
import apexRedirect from "../middlewares/apexRedirect";
import { renderApp, renderShare } from "./app";

const isProduction = env.ENVIRONMENT === "production";
const koa = new Koa();
const router = new Router();

// serve static assets
koa.use(
  serve(path.resolve(__dirname, "../../../public"), {
    maxage: 60 * 60 * 24 * 30 * 1000,
  })
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
        setHeaders: (res) => {
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", `max-age=${365 * 24 * 60 * 60}`);
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

  if (!languages.includes(lng)) {
    ctx.status = 404;
    return;
  }

  await send(ctx, path.join(lng, "translation.json"), {
    setHeaders: (res) => {
      res.setHeader(
        "Cache-Control",
        isProduction ? `max-age=${7 * 24 * 60 * 60}` : "no-cache"
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

router.get("/share/:shareId", renderShare);
router.get("/share/:shareId/doc/:documentSlug", renderShare);
router.get("/share/:shareId/*", renderShare);

// catch all for application
router.get("*", renderApp);

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
koa.use(router.routes());

export default koa;
