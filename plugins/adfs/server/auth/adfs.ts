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
import passportMiddleware from "@server/middlewares/passport";
import { AuthenticationProvider, User } from "@server/models";
import { AuthenticationResult } from "@server/types";
import {
  StateStore,
  getTeamFromContext,
  getClientFromContext,
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";
import { ADFSStrategy } from "./ADFSStrategy";

const router = new Router();
const scopes = env.ADFS_SCOPES.split(" ");

if (
  env.ADFS_CLIENT_ID &&
  env.ADFS_CLIENT_SECRET &&
  env.ADFS_AUTH_URI &&
  env.ADFS_TOKEN_URI &&
  env.ADFS_USERINFO_URI
) {
  passport.use(
    config.id,
    new ADFSStrategy(
      {
        authorizationURL: env.ADFS_AUTH_URI,
        tokenURL: env.ADFS_TOKEN_URI,
        clientID: env.ADFS_CLIENT_ID,
        clientSecret: env.ADFS_CLIENT_SECRET,
        callbackURL: `${env.URL}/auth/${config.id}.callback`,
        passReqToCallback: true,
        scope: env.ADFS_SCOPES,
        // @ts-expect-error custom state store
        store: new StateStore(),
        state: true,
        pkce: false,
      },
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
          // ADFS' /userinfo endpoint only returns a `sub` claim,
          // so we will decode the id_token directly and pull the 
          // claims we want
          const profile: {
            email: string;
            preferred_username: string;
            sub: string;
          } = JWT.decode(params.id_token);

          if (!profile.email) {
            throw AuthenticationError(
              `An email field was not returned in the id_token, but is required.`
            );
          }
          const team = await getTeamFromContext(ctx);
          const client = getClientFromContext(ctx);
          const { domain } = parseEmail(profile.email);

          // Only a single OIDC provider is supported – find the existing, if any.
          const authenticationProvider = team
            ? (await AuthenticationProvider.findOne({
              where: {
                name: "adfs",
                teamId: team.id,
                providerId: domain,
              },
            })) ??
            (await AuthenticationProvider.findOne({
              where: {
                name: "adfs",
                teamId: team.id,
              },
            }))
            : undefined;

          // Derive a providerId from the OIDC location if there is no existing provider.
          const oidcURL = new URL(env.ADFS_AUTH_URI!);
          const providerId =
            authenticationProvider?.providerId ?? oidcURL.hostname;

          if (!domain) {
            throw OIDCMalformedUserInfoError();
          }

          // remove the TLD and form a subdomain from the remaining
          const subdomain = slugifyDomain(domain);

          const name = get(profile, "preferred_username");
          const profileId = profile.sub;

          if (!name) {
            throw AuthenticationError(
              `No preferred_username was returned in the id_token, but one is required.`
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
              email: profile.email,
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
