import OAuth2Server from "@node-oauth/oauth2-server";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import requestTracer from "@server/middlewares/requestTracer";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { OAuthInterface } from "@server/utils/oauth/OAuthInterface";
import oauthErrorHandler from "./middlewares/oauthErrorHandler";

const app = new Koa();
const router = new Router();
const oauth = new OAuth2Server({
  model: OAuthInterface,
});

router.post(
  "/authorize",
  rateLimiter(RateLimiterStrategy.FiftyPerHour),
  auth(),
  async (ctx) => {
    // Note: These objects are mutated by the OAuth2Server library
    const request = new OAuth2Server.Request(ctx.request);
    const response = new OAuth2Server.Response(ctx.response);

    const authorizationCode = await oauth.authorize(request, response, {
      allowEmptyState: true,
      authenticateHandler: {
        // Fetch the current user from the request, so the library knows
        // which user is authorizing the client.
        handle: async () => {
          const { user } = ctx.state.auth;
          return user;
        },
      },
    });

    // In the case of a redirect, the response will be always be a redirect
    // to the redirect_uri with the authorization code as a query parameter.
    if (response.status === 302 && response.headers?.location) {
      const location = response.headers.location;
      delete response.headers.location;
      ctx.set(response.headers);
      ctx.redirect(location);
      return;
    }

    ctx.body = { code: authorizationCode };
  }
);

router.post("/token", async (ctx) => {
  // Note: These objects are mutated by the OAuth2Server library
  const request = new OAuth2Server.Request(ctx.request);
  const response = new OAuth2Server.Response(ctx.response);
  const token = await oauth.token(request, response);

  if (response.headers) {
    ctx.set(response.headers);
  }

  ctx.body = {
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    // OAuth2 spec says that the expires_in should be in seconds.
    expires_in: token.accessTokenExpiresAt
      ? Math.round((token.accessTokenExpiresAt.getTime() - Date.now()) / 1000)
      : undefined,
    token_type: "Bearer",
    // OAuth2 spec says that the scope should be a space-separated list.
    scope: token.scope?.join(" "),
  };
});

app.use(requestTracer());
app.use(oauthErrorHandler());
app.use(bodyParser());
app.use(router.routes());

export default app;
