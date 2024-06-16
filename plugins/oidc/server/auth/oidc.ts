import passport from "@outlinewiki/koa-passport";
import type { Context } from "koa";
import Router from "koa-router";
import get from "lodash/get";
import { Strategy } from "passport-oauth2";
import { slugifyDomain } from "@shared/utils/domains";
import accountProvisioner from "@server/commands/accountProvisioner";
import {
  OIDCMalformedUserInfoError,
  AuthenticationError,
} from "@server/errors";
import passportMiddleware from "@server/middlewares/passport";
import { User } from "@server/models";
import { AuthenticationResult } from "@server/types";
import {
  StateStore,
  getTeamFromContext,
  getClientFromContext,
  request,
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";

const router = new Router();
const scopes = env.OIDC_SCOPES.split(" ");

const authorizationParams = Strategy.prototype.authorizationParams;
Strategy.prototype.authorizationParams = function (options) {
  return {
    ...(options.originalQuery || {}),
    ...(authorizationParams.bind(this)(options) || {}),
  };
};

const authenticate = Strategy.prototype.authenticate;
Strategy.prototype.authenticate = function (req, options) {
  options.originalQuery = req.query;
  authenticate.bind(this)(req, options);
};

if (
  env.OIDC_CLIENT_ID &&
  env.OIDC_CLIENT_SECRET &&
  env.OIDC_AUTH_URI &&
  env.OIDC_TOKEN_URI &&
  env.OIDC_USERINFO_URI
) {
  passport.use(
    config.id,
    new Strategy(
      {
        authorizationURL: env.OIDC_AUTH_URI,
        tokenURL: env.OIDC_TOKEN_URI,
        clientID: env.OIDC_CLIENT_ID,
        clientSecret: env.OIDC_CLIENT_SECRET,
        callbackURL: `${env.URL}/auth/${config.id}.callback`,
        passReqToCallback: true,
        scope: env.OIDC_SCOPES,
        // @ts-expect-error custom state store
        store: new StateStore(),
        state: true,
        pkce: false,
      },
      // OpenID Connect standard profile claims can be found in the official
      // specification.
      // https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
      // Non-standard claims may be configured by individual identity providers.
      // Any claim supplied in response to the userinfo request will be
      // available on the `profile` parameter
      async function (
        ctx: Context,
        accessToken: string,
        refreshToken: string,
        params: { expires_in: number },
        _profile: unknown,
        done: (
          err: Error | null,
          user: User | null,
          result?: AuthenticationResult
        ) => void
      ) {
        try {
          const profile = await request(
            env.OIDC_USERINFO_URI ?? "",
            accessToken
          );

          if (!profile.email) {
            throw AuthenticationError(
              `An email field was not returned in the profile parameter, but is required.`
            );
          }
          const team = await getTeamFromContext(ctx);
          const client = getClientFromContext(ctx);

          const parts = profile.email.toLowerCase().split("@");
          const domain = parts.length && parts[1];

          if (!domain) {
            throw OIDCMalformedUserInfoError();
          }

          // remove the TLD and form a subdomain from the remaining
          const subdomain = slugifyDomain(domain);

          // Claim name can be overriden using an env variable.
          // Default is 'preferred_username' as per OIDC spec.
          const username = get(profile, env.OIDC_USERNAME_CLAIM);
          const name = profile.name || username || profile.username;
          const providerId = profile.sub ? profile.sub : profile.id;

          if (!name) {
            throw AuthenticationError(
              `Neither a name or username was returned in the profile parameter, but at least one is required.`
            );
          }

          const result = await accountProvisioner({
            ip: ctx.ip,
            team: {
              teamId: team?.id,
              // https://github.com/outline/outline/pull/2388#discussion_r681120223
              name: "Wiki",
              domain,
              subdomain,
            },
            user: {
              name,
              email: profile.email,
              avatarUrl: profile.picture,
            },
            authenticationProvider: {
              name: config.id,
              providerId: domain,
            },
            authentication: {
              providerId,
              accessToken,
              refreshToken,
              expiresIn: params.expires_in,
              scopes,
            },
          });
          return done(null, result.user, { ...result, client });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  router.get(config.id, passport.authenticate(config.id));
  router.get(`${config.id}.callback`, passportMiddleware(config.id));
}

export default router;
