// @flow
import * as React from "react";
import path from "path";
import Koa from "koa";
import Router from "koa-router";
import sendfile from "koa-sendfile";
import serve from "koa-static";
import apexRedirect from "./middlewares/apexRedirect";
import renderpage from "./utils/renderpage";
import { isCustomSubdomain, parseDomain } from "../shared/utils/domains";
import { robotsResponse } from "./utils/robots";
import { opensearchResponse } from "./utils/opensearch";
import { NotFoundError } from "./errors";
import { Team } from "./models";

import Home from "./pages/Home";
import Developers from "./pages/developers";
import Api from "./pages/developers/Api";
import SubdomainSignin from "./pages/SubdomainSignin";

const isProduction = process.env.NODE_ENV === "production";
const koa = new Koa();
const router = new Router();

const renderapp = async ctx => {
  if (isProduction) {
    await sendfile(ctx, path.join(__dirname, "../dist/index.html"));
  } else {
    await sendfile(ctx, path.join(__dirname, "./static/dev.html"));
  }
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

// static pages
router.get("/developers", ctx => renderpage(ctx, <Developers />));
router.get("/developers/api", ctx => renderpage(ctx, <Api />));

// home page
router.get("/", async ctx => {
  const lastSignedIn = ctx.cookies.get("lastSignedIn");
  const accessToken = ctx.cookies.get("accessToken");

  // Because we render both the signed in and signed out views depending
  // on a cookie it's important that the browser does not render from cache.
  ctx.set("Cache-Control", "no-cache");

  // If we have an accessToken we can just go ahead and render the app – if
  // the accessToken turns out to be invalid the user will be redirected.
  if (accessToken) {
    return renderapp(ctx);
  }

  // If we're on a custom subdomain then we display a slightly different signed
  // out view that includes the teams basic information.
  if (
    process.env.SUBDOMAINS_ENABLED === "true" &&
    isCustomSubdomain(ctx.request.hostname)
  ) {
    const domain = parseDomain(ctx.request.hostname);
    const subdomain = domain ? domain.subdomain : undefined;
    const team = await Team.findOne({
      where: { subdomain },
    });
    if (team) {
      return renderpage(
        ctx,
        <SubdomainSignin
          team={team}
          guest={ctx.request.query.guest}
          notice={ctx.request.query.notice}
          lastSignedIn={lastSignedIn}
          googleSigninEnabled={!!process.env.GOOGLE_CLIENT_ID}
          slackSigninEnabled={!!process.env.SLACK_KEY}
          hostname={ctx.request.hostname}
        />
      );
    }

    ctx.redirect(`${process.env.URL}?notice=invalid-auth`);
    return;
  }

  // Otherwise, go ahead and render the homepage
  return renderpage(
    ctx,
    <Home
      notice={ctx.request.query.notice}
      lastSignedIn={lastSignedIn}
      googleSigninEnabled={!!process.env.GOOGLE_CLIENT_ID}
      slackSigninEnabled={!!process.env.SLACK_KEY}
    />
  );
});

router.get("/robots.txt", ctx => {
  ctx.body = robotsResponse(ctx);
});

router.get("/opensearch.xml", ctx => {
  ctx.type = "text/xml";
  ctx.body = opensearchResponse();
});

// catch all for react app
router.get("*", async (ctx, next) => {
  if (ctx.request.path === "/realtime/") return next();

  await renderapp(ctx);
  if (!ctx.status) ctx.throw(new NotFoundError());
});

// middleware
koa.use(apexRedirect());
koa.use(router.routes());

export default koa;
