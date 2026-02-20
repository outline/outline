import OAuth2Server from "@node-oauth/oauth2-server";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import env from "@server/env";
import { ValidationError, NotFoundError } from "@server/errors";
import { apiContext } from "@server/middlewares/apiContext";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import requestTracer from "@server/middlewares/requestTracer";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { OAuthAuthorizationCode, OAuthClient, Team } from "@server/models";
import OAuthAuthentication from "@server/models/oauth/OAuthAuthentication";
import { authorize } from "@server/policies";
import { presentDCRClient } from "@server/presenters/oauthClient";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { TeamPreference } from "@shared/types";
import { OAuthInterface } from "@server/utils/oauth/OAuthInterface";
import { getTeamFromContext } from "@server/utils/passport";
import oauthErrorHandler from "./middlewares/oauthErrorHandler";
import registrationAuth from "./middlewares/registrationAuth";
import * as T from "./schema";
import { verifyCSRFToken } from "@server/middlewares/csrf";
import Logger from "@server/logging/Logger";

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
    const request = new OAuth2Server.Request(ctx.request as any);
    const response = new OAuth2Server.Response(ctx.response as any);

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
    const request = new OAuth2Server.Request(ctx.request as any);
    const response = new OAuth2Server.Response(ctx.response as any);
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

router.post(
  "/register",
  validate(T.RegisterSchema),
  rateLimiter(RateLimiterStrategy.FivePerHour),
  async (ctx: APIContext<T.RegisterReq>) => {
    if (env.OAUTH_DISABLE_DCR) {
      throw NotFoundError();
    }

    const {
      client_name,
      redirect_uris,
      token_endpoint_auth_method,
      client_uri,
      logo_uri,
      contacts,
    } = ctx.input.body;

    const team = await getTeamFromContext(ctx, {
      includeStateCookie: false,
    });
    if (!team) {
      throw NotFoundError();
    }
    if (!team.getPreference(TeamPreference.MCP)) {
      throw NotFoundError();
    }

    const clientType =
      token_endpoint_auth_method === "client_secret_post"
        ? "confidential"
        : "public";

    const client = await OAuthClient.createWithCtx(ctx, {
      name: client_name,
      redirectUris: redirect_uris,
      clientType,
      developerUrl: client_uri ?? null,
      avatarUrl: logo_uri ?? null,
      published: false,
      teamId: team.id,
      createdById: null,
    });

    Logger.info("authentication", "OAuth client registered", {
      clientId: client.clientId,
      redirectUris: client.redirectUris,
      teamId: team.id,
      contacts,
    });

    ctx.status = 201;
    ctx.body = presentDCRClient(team.url, client, {
      includeRegistrationAccessToken: true,
      includeCredentials: true,
    });
  }
);

router.get("/register/:clientId", registrationAuth(), async (ctx) => {
  const client: OAuthClient = ctx.state.oauthClient;
  const team = await Team.findByPk(client.teamId, {
    rejectOnEmpty: true,
  });

  ctx.body = presentDCRClient(team.url, client, {
    includeRegistrationAccessToken: false,
  });
});

router.put(
  "/register/:clientId",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.RegisterUpdateSchema),
  transaction(),
  registrationAuth(),
  async (ctx: APIContext<T.RegisterUpdateReq>) => {
    const client = ctx.state.oauthClient as OAuthClient;
    const { client_name, redirect_uris, client_uri, logo_uri } = ctx.input.body;

    const team = await Team.findByPk(client.teamId, {
      rejectOnEmpty: true,
      transaction: ctx.state.transaction,
    });

    client.name = client_name;
    client.redirectUris = redirect_uris;
    client.developerUrl = client_uri ?? null;
    client.avatarUrl = logo_uri ?? null;

    // Rotate registration access token per RFC 7592 recommendation
    client.rotateRegistrationAccessToken();
    await client.saveWithCtx(ctx);

    ctx.body = presentDCRClient(team.url, client, {
      includeRegistrationAccessToken: true,
      includeCredentials: false,
    });
  }
);

router.delete(
  "/register/:clientId",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  transaction(),
  registrationAuth(),
  async (ctx: APIContext) => {
    const client = ctx.state.oauthClient as OAuthClient;
    await client.destroyWithCtx(ctx);
    ctx.status = 204;
    ctx.body = "";
  }
);

app.use(requestTracer());
app.use(oauthErrorHandler());
app.use(bodyParser());
app.use(apiContext());
app.use(verifyCSRFToken());
app.use(router.routes());

export default app;
