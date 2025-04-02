import OAuth2Server from "@node-oauth/oauth2-server";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { OAuthInterface } from "./interface";

const app = new Koa();

const router = new Router();

const oauth = new OAuth2Server({
  model: OAuthInterface,
});

router.post("/authorize", auth(), async (ctx) => {
  const request = new OAuth2Server.Request(ctx.request);
  const response = new OAuth2Server.Response(ctx.response);

  const authorizationCode = await oauth.authorize(request, response);
  ctx.body = { code: authorizationCode };
});

router.post("/token", async (ctx) => {
  const request = new OAuth2Server.Request(ctx.request);
  const response = new OAuth2Server.Response(ctx.response);

  const token = await oauth.token(request, response);
  ctx.body = { token };
});

app.use(bodyParser());
app.use(router.routes());

export default app;
