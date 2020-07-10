// @flow
import path from "path";
import Koa from "koa";
import Router from "koa-router";
import sendfile from "koa-sendfile";
import serve from "koa-static";
import apexRedirect from "./middlewares/apexRedirect";
import { robotsResponse } from "./utils/robots";
import { opensearchResponse } from "./utils/opensearch";

const isProduction = process.env.NODE_ENV === "production";
const koa = new Koa();
const router = new Router();

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

  if (isProduction) {
    await sendfile(ctx, path.join(__dirname, "../dist/index.html"));
  } else {
    await sendfile(ctx, path.join(__dirname, "./static/dev.html"));
  }
});

// middleware
koa.use(apexRedirect());
koa.use(router.routes());

export default koa;
