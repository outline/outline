import OAuth2Server from "@node-oauth/oauth2-server";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import requestTracer from "@server/middlewares/requestTracer";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { OAuthAuthorizationCode, OAuthClient } from "@server/models";
import OAuthAuthentication from "@server/models/oauth/OAuthAuthentication";
import { authorize } from "@server/policies";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { OAuthInterface } from "@server/utils/oauth/OAuthInterface";
import oauthErrorHandler from "./middlewares/oauthErrorHandler";
import * as T from "./schema";
import { verifyCSRFToken } from "@server/middlewares/csrf";

const app = new Koa();
const router = new Router();
const oauth = new OAuth2Server({
  model: OAuthInterface,
  requireClientAuthentication: {
    // Allow public clients (those without a client secret) to refresh without a client secret.
    refresh_token: false,
  },
  // Always revoke the used refresh token and issue a new one, see:
  // https://www.rfc-editor.org/rfc/rfc6819#section-5.2.2.3
  alwaysIssueNewRefreshToken: true,
});

router.post(
  "/authorize",
  rateLimiter(RateLimiterStrategy.OneHundredPerHour),
  auth(),
  async (ctx) => {
    const { user } = ctx.state.auth;
    const clientId = ctx.request.body.client_id;
    if (!clientId) {
      throw ValidationError("Missing client_id");
    }

    const client = await OAuthClient.findByClientId(clientId);
    authorize(user, "read", client);

    // Note: These objects are mutated by the OAuth2Server library
    const request = new OAuth2Server.Request(ctx.request);
    const response = new OAuth2Server.Response(ctx.response);

    const authorizationCode = await oauth.authorize(request, response, {
      // Require state to prevent CSRF attacks
      allowEmptyState: false,
      authorizationCodeLifetime:
        OAuthAuthorizationCode.authorizationCodeLifetime,
      authenticateHandler: {
        // Fetch the current user from the request, so the library knows
        // which user is authorizing the client.
        handle: async () => user,
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

router.post(
  "/token",
  validate(T.TokenSchema),
  rateLimiter(RateLimiterStrategy.OneHundredPerHour),
  async (ctx: APIContext<T.TokenReq>) => {
    const grantType = ctx.input.body.grant_type;
    const refreshToken = ctx.input.body.refresh_token;
    const clientId = ctx.input.body.client_id;
    const clientSecret = ctx.input.body.client_secret;

    // Because we disabled client authentication for refresh_token grant type at the library
    // initialization, we need to manually enforce it here for confidential clients.
    if (grantType === "refresh_token" && !clientSecret) {
      if (!refreshToken) {
        throw ValidationError(
          "Missing refresh_token for refresh_token grant type"
        );
      }
      if (!clientId) {
        throw ValidationError("Missing client_id for refresh_token grant type");
      }
      const client = await OAuthClient.findByClientId(clientId);
      if (!client) {
        throw ValidationError("Invalid client_id");
      }
      if (client.clientType === "confidential") {
        throw ValidationError("Missing client_secret for confidential client");
      }
    }

    // Note: These objects are mutated by the OAuth2Server library
    const request = new OAuth2Server.Request(ctx.request);
    const response = new OAuth2Server.Response(ctx.response);
    const token = await oauth.token(request, response, {
      accessTokenLifetime: OAuthAuthentication.accessTokenLifetime,
      refreshTokenLifetime: OAuthAuthentication.refreshTokenLifetime,
    });

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
  }
);

router.post(
  "/revoke",
  rateLimiter(RateLimiterStrategy.OneHundredPerHour),
  validate(T.TokenRevokeSchema),
  transaction(),
  async (ctx: APIContext<T.TokenRevokeReq>) => {
    const { token } = ctx.input.body;

    if (OAuthAuthentication.match(token)) {
      const accessToken = await OAuthAuthentication.findByAccessToken(token);
      await accessToken?.destroyWithCtx(ctx);
    }

    if (OAuthAuthentication.matchRefreshToken(token)) {
      const refreshToken = await OAuthAuthentication.findByRefreshToken(token);
      await refreshToken?.destroyWithCtx(ctx);
    }

    // https://datatracker.ietf.org/doc/html/rfc7009#section-2.2
    // Note: invalid tokens do not cause an error response since the client
    // cannot handle such an error in a reasonable way
    ctx.body = {
      success: true,
    };
  }
);

app.use(requestTracer());
app.use(oauthErrorHandler());
app.use(bodyParser());
app.use(verifyCSRFToken());
app.use(router.routes());

export default app;
