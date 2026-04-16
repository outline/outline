import passport from "@outlinewiki/koa-passport";
import { Strategy as AzureStrategy } from "@outlinewiki/passport-azure-ad-oauth2";
import jwt from "jsonwebtoken";
import type { Context } from "koa";
import Router from "koa-router";
import type { Profile } from "passport";
import { slugifyDomain } from "@shared/utils/domains";
import { parseEmail } from "@shared/utils/email";
import accountProvisioner from "@server/commands/accountProvisioner";
import { MicrosoftGraphError } from "@server/errors";
import passportMiddleware from "@server/middlewares/passport";
import type { User } from "@server/models";
import type { AuthenticationResult } from "@server/types";
import {
  StateStore,
  request,
  getTeamFromContext,
  getClientFromOAuthState,
  getUserFromOAuthState,
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";
import { createContext } from "@server/context";

import {
  getClientAssertion,
  initializeManagedIdentityAuth,
} from "./managedIdentityAuth";

const router = new Router();
const scopes: string[] = [];

const hasCredentials =
  env.AZURE_CLIENT_ID &&
  (env.AZURE_CLIENT_SECRET || env.AZURE_USE_MANAGED_IDENTITY);

if (hasCredentials) {
  void initializeManagedIdentityAuth();

  // When using managed identity, provide a placeholder secret. The actual
  // authentication is handled via client_assertion in the token exchange,
  // injected by the custom tokenParams override below.
  const effectiveSecret = env.AZURE_CLIENT_SECRET ?? "managed-identity";

  const strategy = new AzureStrategy(
    {
      clientID: env.AZURE_CLIENT_ID!,
      clientSecret: effectiveSecret,
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
      context: Context,
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

        const team = await getTeamFromContext(context);
        const client = getClientFromOAuthState(context);
        const user =
          context.state?.auth?.user ?? (await getUserFromOAuthState(context));

        const domain = parseEmail(email).domain;
        const subdomain = slugifyDomain(domain);

        const teamName = organization.displayName;
        const ctx = createContext({
          ip: context.ip,
          user,
          authType: context.state?.auth?.type,
        });
        const result = await accountProvisioner(ctx, {
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

  // When using managed identity, override tokenParams to inject
  // client_assertion instead of client_secret for the token exchange.
  if (env.AZURE_USE_MANAGED_IDENTITY) {
    const originalTokenParams = strategy.tokenParams.bind(strategy);
    strategy.tokenParams = function (options: Record<string, string>) {
      const assertion = getClientAssertion();
      if (!assertion) {
        throw new Error(
          "Azure managed identity authentication is enabled, but no client " +
            "assertion is available for the token exchange. Check that the " +
            "managed identity endpoint is reachable."
        );
      }

      const params = originalTokenParams(options);
      params.client_assertion = assertion;
      params.client_assertion_type =
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
      return params;
    };

    // passport-oauth2 sends client_secret in the token request by default.
    // When using managed identity we authenticate via client_assertion
    // instead, so we must clear the placeholder secret to prevent it from
    // being sent alongside the assertion. The _oauth2 property is an
    // internal detail of passport-oauth2@1.x (oauth2 npm package); if the
    // library changes its internals this will need updating.
    // @ts-expect-error accessing private _oauth2 property
    const oauth2 = strategy._oauth2;
    if (oauth2) {
      // @ts-expect-error clearing protected _clientSecret
      oauth2._clientSecret = "";
    }
  }

  passport.use(strategy);
  router.get(
    config.id,
    passport.authenticate(config.id, { prompt: "select_account" })
  );
  router.get(`${config.id}.callback`, passportMiddleware(config.id));
}

export default router;
