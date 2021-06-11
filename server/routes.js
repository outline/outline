// @flow
import fs from "fs";
import path from "path";
import util from "util";
import Koa from "koa";
import Router from "koa-router";
import sendfile from "koa-sendfile";
import serve from "koa-static";
import isUUID from "validator/lib/isUUID";
import { languages } from "../shared/i18n";
import env from "./env";
import apexRedirect from "./middlewares/apexRedirect";
import Share from "./models/Share";
import metaTags from "./utils/metaTags";
import { opensearchResponse } from "./utils/opensearch";
import prefetchTags from "./utils/prefetchTags";
import { robotsResponse } from "./utils/robots";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const koa = new Koa();
const router = new Router();
const readFile = util.promisify(fs.readFile);

const readIndexFile = async (ctx) => {
  if (isProduction) {
    return readFile(path.join(__dirname, "../app/index.html"));
  }
  if (isTest) {
    return readFile(path.join(__dirname, "/static/index.html"));
  }

  const middleware = ctx.devMiddleware;
  await new Promise((resolve) => middleware.waitUntilValid(resolve));

  return new Promise((resolve, reject) => {
    middleware.fileSystem.readFile(
      `${ctx.webpackConfig.output.path}/index.html`,
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      }
    );
  });
};

const renderApp = async (ctx, next, title = null) => {
  if (ctx.request.path === "/realtime/") {
    return next();
  }

  const page = await readIndexFile(ctx);
  const environment = `
    window.env = ${JSON.stringify(env)};
  `;

  ctx.body = page
    .toString()
    .replace(/\/\/inject-env\/\//g, environment)
    .replace(/\/\/inject-meta-tags\/\//g, metaTags(title))
    .replace(/\/\/inject-prefetch\/\//g, prefetchTags)
    .replace(/\/\/inject-slack-app-id\/\//g, process.env.SLACK_APP_ID || "");
};

const renderShare = async (ctx, next) => {
  const { shareId } = ctx.params;

  // Find the share record if publicly published so that the document title
  // can be be returned in the server-rendered HTML. This allows it to appear in
  // unfurls with more reliablity
  let share;

  if (isUUID(shareId)) {
    share = await Share.findOne({
      where: {
        id: shareId,
        published: true,
      },
    });
  }

  // Allow shares to be embedded in iframes on other websites
  ctx.remove("X-Frame-Options");

  return renderApp(ctx, next, share ? share.document.title : undefined);
};

// serve static assets
koa.use(
  serve(path.resolve(__dirname, "../../public"), {
    maxage: 60 * 60 * 24 * 30 * 1000,
  })
);

router.get("/_health", (ctx) => (ctx.body = "OK"));

if (process.env.NODE_ENV === "production") {
  router.get("/static/*", async (ctx) => {
    ctx.set({
      "Service-Worker-Allowed": "/",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `max-age=${356 * 24 * 60 * 60}`,
    });

    await sendfile(ctx, path.join(__dirname, "../app/", ctx.path.substring(8)));
  });
}

router.get("/locales/:lng.json", async (ctx) => {
  let { lng } = ctx.params;

  if (!languages.includes(lng)) {
    ctx.status = 404;
    return;
  }

  if (process.env.NODE_ENV === "production") {
    ctx.set({
      "Cache-Control": `max-age=${7 * 24 * 60 * 60}`,
    });
  }

  await sendfile(
    ctx,
    path.join(__dirname, "../shared/i18n/locales", lng, "translation.json")
  );
});

router.get("/robots.txt", (ctx) => {
  ctx.body = robotsResponse(ctx);
});

router.get("/opensearch.xml", (ctx) => {
  ctx.type = "text/xml";
  ctx.body = opensearchResponse();
});

router.get("/share/:shareId", renderShare);
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
