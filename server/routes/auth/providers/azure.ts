import passport from "@outlinewiki/koa-passport";
import { Strategy as AzureStrategy } from "@outlinewiki/passport-azure-ad-oauth2";
import jwt from "jsonwebtoken";
import { Request } from "koa";
import Router from "koa-router";
import { Profile } from "passport";
import accountProvisioner, {
  AccountProvisionerResult,
} from "@server/commands/accountProvisioner";
import env from "@server/env";
import { MicrosoftGraphError } from "@server/errors";
import passportMiddleware from "@server/middlewares/passport";
import { User } from "@server/models";
import { StateStore, request } from "@server/utils/passport";

const router = new Router();
const providerName = "azure";
const scopes: string[] = [];

export const config = {
  name: "Microsoft",
  enabled: !!env.AZURE_CLIENT_ID,
};

if (env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET) {
  const strategy = new AzureStrategy(
    {
      clientID: env.AZURE_CLIENT_ID,
      clientSecret: env.AZURE_CLIENT_SECRET,
      callbackURL: `${env.URL}/auth/azure.callback`,
      useCommonEndpoint: true,
      passReqToCallback: true,
      resource: env.AZURE_RESOURCE_APP_ID,
      // @ts-expect-error StateStore
      store: new StateStore(),
      scope: scopes,
    },
    async function (
      req: Request,
      accessToken: string,
      refreshToken: string,
      params: { id_token: string },
      _profile: Profile,
      done: (
        err: Error | null,
        user: User | null,
        result?: AccountProvisionerResult
      ) => void
    ) {
      try {
        // see docs for what the fields in profile represent here:
        // https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens
        const profile = jwt.decode(params.id_token) as jwt.JwtPayload;

        const [profileResponse, organizationResponse] = await Promise.all([
          // Load the users profile from the Microsoft Graph API
          // https://docs.microsoft.com/en-us/graph/api/resources/users?view=graph-rest-1.0
          request(`https://graph.microsoft.com/v1.0/me`, accessToken),
          // Load the organization profile from the Microsoft Graph API
          // https://docs.microsoft.com/en-us/graph/api/organization-get?view=graph-rest-1.0
          request(`https://graph.microsoft.com/v1.0/organization`, accessToken),
        ]);

        if (!profileResponse) {
          throw MicrosoftGraphError(
            "Unable to load user profile from Microsoft Graph API"
          );
        }

        if (!organizationResponse) {
          throw MicrosoftGraphError(
            "Unable to load organization info from Microsoft Graph API"
          );
        }

        const organization = organizationResponse.value[0];
        const email = profile.email || profileResponse.mail;

        if (!email) {
          throw MicrosoftGraphError(
            "'email' property is required but could not be found in user profile."
          );
        }

        const domain = email.split("@")[1];
        const subdomain = domain.split(".")[0];
        const teamName = organization.displayName;
        const result = await accountProvisioner({
          ip: req.ip,
          team: {
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
            name: providerName,
            providerId: profile.tid,
          },
          authentication: {
            providerId: profile.oid,
            accessToken,
            refreshToken,
            scopes,
          },
        });
        return done(null, result.user, result);
      } catch (err) {
        return done(err, null);
      }
    }
  );
  passport.use(strategy);

  router.get("azure", passport.authenticate(providerName));

  router.get("azure.callback", passportMiddleware(providerName));
}

export default router;
