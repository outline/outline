import passport from "@outlinewiki/koa-passport";
import JWT from "jsonwebtoken";
import type { Context } from "koa";
import Router from "koa-router";
import get from "lodash/get";
import { slugifyDomain } from "@shared/utils/domains";
import { parseEmail } from "@shared/utils/email";
import accountProvisioner from "@server/commands/accountProvisioner";
import {
  OIDCMalformedUserInfoError,
  AuthenticationError,
} from "@server/errors";
import Logger from "@server/logging/Logger";
import passportMiddleware from "@server/middlewares/passport";
import { AuthenticationProvider, User } from "@server/models";
import { AuthenticationResult } from "@server/types";
import {
  StateStore,
  getTeamFromContext,
  getClientFromContext,
  request,
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";
import { OIDCStrategy } from "./OIDCStrategy";

const router = new Router();
const scopes = env.OIDC_SCOPES.split(" ");

if (
  env.OIDC_CLIENT_ID &&
  env.OIDC_CLIENT_SECRET &&
  env.OIDC_AUTH_URI &&
  env.OIDC_TOKEN_URI &&
  env.OIDC_USERINFO_URI
) {
  passport.use(
    config.id,
    new OIDCStrategy(
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
        params: { expires_in: number; id_token: string },
        _profile: unknown,
        done: (
          err: Error | null,
          user: User | null,
          result?: AuthenticationResult
        ) => void
      ) {
        try {
          // Some providers require a POST request to the userinfo endpoint, add them as exceptions here.
          const usePostMethod = [
            "https://api.dropboxapi.com/2/openid/userinfo",
          ];

          const profile = await request(
            usePostMethod.includes(env.OIDC_USERINFO_URI!) ? "POST" : "GET",
            env.OIDC_USERINFO_URI!,
            accessToken
          );

          // Some providers, namely ADFS, don't provide anything more than the `sub` claim in the userinfo endpoint
          // So, we'll decode the params.id_token and see if that contains what we need.
          const token = (() => {
            try {
              const decoded = JWT.decode(params.id_token);

              if (!decoded || typeof decoded !== "object") {
                Logger.warn("Decoded id_token is not a valid object");
                return {};
              }

              return decoded as {
                email?: string;
                preferred_username?: string;
                sub?: string;
              };
            } catch (err) {
              Logger.error("id_token decode threw error: ", err);
              return {};
            }
          })();

          const email = profile.email ?? token.email ?? null;

          if (!email) {
            throw AuthenticationError(
              `An email field was not returned in the profile or id_token parameter, but is required.`
            );
          }

          const team = await getTeamFromContext(ctx);
          const client = getClientFromContext(ctx);
          const { domain } = parseEmail(email);

          // Only a single OIDC provider is supported – find the existing, if any.
          const authenticationProvider = team
            ? (await AuthenticationProvider.findOne({
                where: {
                  name: "oidc",
                  teamId: team.id,
                  providerId: domain,
                },
              })) ??
              (await AuthenticationProvider.findOne({
                where: {
                  name: "oidc",
                  teamId: team.id,
                },
              }))
            : undefined;

          // Derive a providerId from the OIDC location if there is no existing provider.
          const oidcURL = new URL(env.OIDC_AUTH_URI!);
          const providerId =
            authenticationProvider?.providerId ?? oidcURL.hostname;

          if (!domain) {
            throw OIDCMalformedUserInfoError();
          }

          // remove the TLD and form a subdomain from the remaining
          const subdomain = slugifyDomain(domain);

          // Claim name can be overriden using an env variable.
          // Default is 'preferred_username' as per OIDC spec.
          // This will default to the profile.preferred_username, but will fall back to preferred_username from the id_token
          const username =
            get(profile, env.OIDC_USERNAME_CLAIM) ??
            get(token, env.OIDC_USERNAME_CLAIM);
          const name = profile.name || username || profile.username;
          const profileId = profile.sub ? profile.sub : profile.id;

          if (!name) {
            throw AuthenticationError(
              `Neither a ${env.OIDC_USERNAME_CLAIM}, name or username was returned in the profile parameter, but at least one is required.`
            );
          }

          const result = await accountProvisioner({
            ip: ctx.ip,
            team: {
              teamId: team?.id,
              name: env.APP_NAME,
              domain,
              subdomain,
            },
            user: {
              name,
              email,
              avatarUrl: profile.picture,
            },
            authenticationProvider: {
              name: config.id,
              providerId,
            },
            authentication: {
              providerId: profileId,
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
  router.post(`${config.id}.callback`, passportMiddleware(config.id));
}

export default router;
