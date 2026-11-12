import Koa from "koa";
import env from "@server/env";
import apexRedirect from "@server/middlewares/apexRedirect";
import appHeaders from "@server/middlewares/appHeaders";
import app from "./app";
import assets from "./assets";
import discovery from "./discovery";
import embeds from "./embeds";
import errors from "./errors";
import shares from "./shares";

const koa = new Koa();

koa.use(appHeaders());
koa.use(apexRedirect());

if (env.ENVIRONMENT === "test") {
  koa.use(errors.routes());
}

koa.use(assets.routes());
koa.use(discovery.routes());
koa.use(embeds.routes());
koa.use(shares.routes());

// The app router has a catch-all route, so it must be last.
koa.use(app.routes());

export default koa;
