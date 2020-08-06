// @flow
import path from "path";
import Koa from "koa";
import Router from "koa-router";
import fs from "fs";
import util from "util";
import sendfile from "koa-sendfile";
import serve from "koa-static";
import apexRedirect from "./middlewares/apexRedirect";
import { robotsResponse } from "./utils/robots";
import { opensearchResponse } from "./utils/opensearch";
import environment from "./env";

const isProduction = process.env.NODE_ENV === "production";
const koa = new Koa();
const router = new Router();
const readFile = util.promisify(fs.readFile);

const readIndexFile = async ctx => {
  if (isProduction) {
    return readFile(path.join(__dirname, "../dist/index.html"));
  }

  const middleware = ctx.devMiddleware;
  await new Promise(resolve => middleware.waitUntilValid(resolve));

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

// serve static assets
koa.use(
  serve(path.resolve(__dirname, "../public"), {
    maxage: 60 * 60 * 24 * 30 * 1000,
  })
);

router.get("/_health", ctx => (ctx.body = "OK"));

if (process.env.NODE_ENV === "production") {
  router.get("/static/*", async ctx => {
    ctx.set({
      "Cache-Control": `max-age=${356 * 24 * 60 * 60}`,
    });

    await sendfile(
      ctx,
      path.join(__dirname, "../dist/", ctx.path.substring(8))
    );
  });
}

router.get("/robots.txt", ctx => {
  ctx.body = robotsResponse(ctx);
});

router.get("/opensearch.xml", ctx => {
  ctx.type = "text/xml";
  ctx.body = opensearchResponse();
});

// catch all for application
router.get("*", async (ctx, next) => {
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
});

// middleware
koa.use(apexRedirect());
koa.use(router.routes());

export default koa;
