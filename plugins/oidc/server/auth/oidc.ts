import Router from "koa-router";
import env from "../env";
import { createOIDCRouter } from "./oidcRouter";

// Create router and mount endpoints with manual configuration from environment variables
const router = new Router();
createOIDCRouter(router, {
  authorizationURL: env.OIDC_AUTH_URI!,
  tokenURL: env.OIDC_TOKEN_URI!,
  userInfoURL: env.OIDC_USERINFO_URI!,
  logoutURL: env.OIDC_LOGOUT_URI,
});

export default router;
