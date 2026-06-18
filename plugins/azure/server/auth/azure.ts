import passport from "@outlinewiki/koa-passport";
import { Strategy as AzureStrategy } from "@outlinewiki/passport-azure-ad-oauth2";
import jwt from "jsonwebtoken";
import type { Context } from "koa";
import Router from "koa-router";
import type { Profile } from "passport";
import { toError } from "@shared/utils/error";
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
  startOAuthFlow,
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";
import { createContext } from "@server/context";
import fetch from "@server/utils/fetch";
import UploadUserAvatarTask from "@server/queues/tasks/UploadUserAvatarTask";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { AttachmentPreset } from "@shared/types";
import { UserFlag } from "@server/models/User";

const router = new Router();
const scopes: string[] = [];

/**
 * Loads the user's profile photo from the Microsoft Graph API and encodes it as
 * a data URL. Entra ID does not emit a `picture` claim in the ID token, so the
 * photo is only available via Graph. Requires no additional permissions beyond
 * the delegated `User.Read` already used to load the profile.
 *
 * @param accessToken The delegated access token for the Microsoft Graph API.
 * @returns A base64 encoded data URL for the photo, or undefined if not set.
 */
async function requestPhoto(accessToken: string): Promise<string | undefined> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/photo/$value",
      {
        method: "GET",
        allowPrivateIPAddress: true,
        // Cap how long we'll wait and how many bytes we'll buffer so a slow or
        // oversized response can never stall the login callback.
        timeout: 10000,
        size: AttachmentHelper.presetToMaxUploadSize(AttachmentPreset.Avatar),
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // A missing photo returns 404, which we can safely ignore.
    if (!response.ok) {
      return undefined;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.buffer();
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (_err) {
    return undefined;
  }
}

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

        // The mail and userPrincipalName values come from the directory via the
        // Graph API and are owned by the organization, so an email sourced from
        // them is inherently trusted. Microsoft's mutable `email` token claim is
        // only trusted when a verification claim confirms it — xms_edov for
        // workforce tenants, or the standard email_verified claim in External ID
        // / OIDC scenarios.
        // https://learn.microsoft.com/en-us/entra/identity-platform/reference-claims-customization
        const directoryEmails = [
          profileResponse.mail,
          profileResponse.userPrincipalName,
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase());

        const verificationClaims = [
          profile.xms_edov,
          profile.email_verified,
        ].filter((claim) => claim !== undefined);
        const emailVerified =
          directoryEmails.includes(email.toLowerCase()) ||
          (verificationClaims.length
            ? verificationClaims.some(
                (claim) => claim === true || claim === "true"
              )
            : undefined);

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
            emailVerified,
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
        // Entra ID does not include the photo in the token, so it must be
        // fetched separately from Graph. To avoid the extra round-trip on every
        // sign-in we only do so when the user has no avatar yet and hasn't set
        // one manually — this also backfills accounts created before avatar
        // syncing was supported, and stops once an avatar is stored.
        if (
          !result.user.avatarUrl &&
          !result.user.getFlag(UserFlag.AvatarUpdated)
        ) {
          const avatarUrl = await requestPhoto(accessToken);
          if (avatarUrl) {
            await new UploadUserAvatarTask().schedule({
              userId: result.user.id,
              avatarUrl,
            });
          }
        }

        return done(null, result.user, { ...result, client });
      } catch (err) {
        return done(toError(err), null);
      }
    }
  );
  passport.use(strategy);
  router.get(
    config.id,
    startOAuthFlow,
    passport.authenticate(config.id, { prompt: "select_account" })
  );
  router.get(`${config.id}.callback`, passportMiddleware(config.id));
}

export default router;
