import OAuth2Server from "@node-oauth/oauth2-server";
import Router from "koa-router";
import { OAuthInterface } from "./interface";

const router = new Router();

const oauth = new OAuth2Server({
  model: OAuthInterface,
});

router.get("/oauth/authorize", async (ctx) => {
  const request = new OAuth2Server.Request(ctx.request);
  const response = new OAuth2Server.Response(ctx.response);

  const authorizationCode = await oauth.authorize(request, response);
  ctx.body = { code: authorizationCode };
});

router.post("/oauth/token", async (ctx) => {
  const request = new OAuth2Server.Request(ctx.request);
  const response = new OAuth2Server.Response(ctx.response);

  const token = await oauth.token(request, response);
  ctx.body = { token };
});

export default router;
