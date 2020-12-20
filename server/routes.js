// @flow
import fs from "fs";
import path from "path";
import util from "util";
import Koa from "koa";
import Router from "koa-router";
import sendfile from "koa-sendfile";
import serve from "koa-static";
import { languages } from "../shared/i18n";
import environment from "./env";
import apexRedirect from "./middlewares/apexRedirect";
import { opensearchResponse } from "./utils/opensearch";
import { robotsResponse } from "./utils/robots";

const isProduction = process.env.NODE_ENV === "production";
const koa = new Koa();
const router = new Router();
const readFile = util.promisify(fs.readFile);

const readIndexFile = async (ctx) => {
  if (isProduction) {
    return readFile(path.join(__dirname, "../app/index.html"));
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

const renderApp = async (ctx, next) => {
  if (ctx.request.path === "/realtime/") {
    return next();
  }

  const page = await readIndexFile(ctx);
  const env = `
    window.env = ${JSON.stringify(environment)};
  `;
  ctx.body = page
    .toString()
    .replace(/\/\/inject-env\/\//g, env)
    .replace(/\/\/inject-sentry-dsn\/\//g, process.env.SENTRY_DSN || "")
    .replace(/\/\/inject-slack-app-id\/\//g, process.env.SLACK_APP_ID || "");
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

router.get("/share/*", (ctx, next) => {
  ctx.remove("X-Frame-Options");
  return renderApp(ctx, next);
});

// catch all for application
router.get("*", renderApp);

// middleware
koa.use(apexRedirect());
koa.use(router.routes());

export default koa;
