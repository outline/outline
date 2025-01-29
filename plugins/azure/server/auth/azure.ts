import passport from "@outlinewiki/koa-passport";
import { Strategy as AzureStrategy } from "@outlinewiki/passport-azure-ad-oauth2";
import jwt from "jsonwebtoken";
import type { Context } from "koa";
import Router from "koa-router";
import { Profile } from "passport";
import { slugifyDomain } from "@shared/utils/domains";
import { parseEmail } from "@shared/utils/email";
import accountProvisioner from "@server/commands/accountProvisioner";
import { MicrosoftGraphError } from "@server/errors";
import passportMiddleware from "@server/middlewares/passport";
import { User } from "@server/models";
import { AuthenticationResult } from "@server/types";
import {
  StateStore,
  request,
  getTeamFromContext,
  getClientFromContext,
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";

const router = new Router();
const scopes: string[] = [];

if (env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET) {
  const strategy = new AzureStrategy(
    {
      clientID: env.AZURE_CLIENT_ID,
      clientSecret: env.AZURE_CLIENT_SECRET,
      callbackURL: `${env.URL}/auth/azure.callback`,
      useCommonEndpoint: env.AZURE_TENANT_ID ? false : true,
      tenant: env.AZURE_TENANT_ID ? env.AZURE_TENANT_ID : undefined,
      passReqToCallback: true,
      resource: env.AZURE_RESOURCE_APP_ID,
      // @ts-expect-error StateStore
      store: new StateStore(),
      scope: scopes,
    },
    async function (
      ctx: Context,
      accessToken: string,
      refreshToken: string,
      params: { expires_in: number; id_token: string },
      _profile: Profile,
      done: (
        err: Error | null,
        user: User | null,
        result?: AuthenticationResult
      ) => void
    ) {
      try {
        // see docs for what the fields in profile represent here:
        // https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens
        const profile = jwt.decode(params.id_token) as jwt.JwtPayload;

        const [profileResponse, organizationResponse] = await Promise.all([
          // Load the users profile from the Microsoft Graph API
          // https://docs.microsoft.com/en-us/graph/api/resources/users?view=graph-rest-1.0
          request("GET", `https://graph.microsoft.com/v1.0/me`, accessToken),
          // Load the organization profile from the Microsoft Graph API
          // https://docs.microsoft.com/en-us/graph/api/organization-get?view=graph-rest-1.0
          request(
            "GET",
            `https://graph.microsoft.com/v1.0/organization`,
            accessToken
          ),
        ]);

        if (!profileResponse) {
          throw MicrosoftGraphError(
            "Unable to load user profile from Microsoft Graph API"
          );
        }

        if (!organizationResponse?.value?.length) {
          throw MicrosoftGraphError(
            `Unable to load organization info from Microsoft Graph API: ${organizationResponse.error?.message}`
          );
        }

        const organization = organizationResponse.value[0];

        // Note: userPrincipalName is last here for backwards compatibility with
        // previous versions of Outline that did not include it.
        const email =
          profile.email ||
          profileResponse.mail ||
          profileResponse.userPrincipalName;

        if (!email) {
          throw MicrosoftGraphError(
            "'email' property is required but could not be found in user profile."
          );
        }

        const team = await getTeamFromContext(ctx);
        const client = getClientFromContext(ctx);

        const domain = parseEmail(email).domain;
        const subdomain = slugifyDomain(domain);

        const teamName = organization.displayName;
        const result = await accountProvisioner({
          ip: ctx.ip,
          team: {
            teamId: team?.id,
            name: teamName,
            domain,
            subdomain,
          },
          user: {
            name: profile.name,
            email,
            avatarUrl: profile.picture,
          },
          authenticationProvider: {
            name: config.id,
            providerId: profile.tid,
          },
          authentication: {
            providerId: profile.oid,
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
  );
  passport.use(strategy);
  router.get(
    config.id,
    passport.authenticate(config.id, { prompt: "select_account" })
  );
  router.get(`${config.id}.callback`, passportMiddleware(config.id));
}

export default router;
