import passport from "@outlinewiki/koa-passport";
import JWT from "jsonwebtoken";
import type { Context, Request } from "koa";
import type Router from "@koa/router";
import { get } from "es-toolkit/compat";
import { toError } from "@shared/utils/error";
import { slugifyDomain } from "@shared/utils/domains";
import { parseEmail } from "@shared/utils/email";
import { getSupportedLanguage } from "@shared/utils/language";
import { isBase64Url } from "@shared/utils/urls";
import accountProvisioner from "@server/commands/accountProvisioner";
import { AuthenticationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import passportMiddleware from "@server/middlewares/passport";
import type { User } from "@server/models";
import type { AuthenticationResult } from "@server/types";
import { LogoutTokenStore } from "@server/utils/LogoutTokenStore";
import {
  StateStore,
  getTeamFromContext,
  getClientFromOAuthState,
  getUserFromOAuthState,
  request,
  startOAuthFlow,
  withProxyAgent,
} from "@server/utils/passport";
import config from "../../plugin.json";
import env from "../env";
import { OIDCStrategy } from "./OIDCStrategy";
import { resolveProviderId } from "./resolveProviderId";
import { createContext } from "@server/context";
import { OIDCMalformedUserInfoError } from "../errors";

export interface OIDCEndpoints {
  authorizationURL: string;
  tokenURL: string;
  userInfoURL: string;
  logoutURL?: string;
  pkce?: boolean;
}

export interface OIDCStrategyOptions {
  /** The authentication provider name recorded on sign-in, eg "oidc". */
  name: string;
  /** The endpoints of the identity provider. */
  endpoints: OIDCEndpoints;
  /** The OAuth client identifier. */
  clientID: string;
  /** The OAuth client secret. */
  clientSecret: string;
  /** The URL that the identity provider redirects back to. */
  callbackURL: string;
  /** A space separated list of scopes to request. */
  scopes: string;
  /** The claim to use as the user's display name. */
  usernameClaim: string;
  /** Whether requests to the identity provider may reach private IP addresses. */
  allowPrivateIPAddress: boolean;
  /**
   * Persists the id token for a later logout, when the provider supports it.
   *
   * @param context the request context.
   * @param idToken the id token returned by the provider.
   */
  persistLogoutToken?: (context: Context, idToken: string) => Promise<void>;
  /**
   * Resolves the team and external provider identifier to sign in with.
   *
   * @param context the request context.
   * @param domain the domain of the user's email address.
   * @returns the team id, if known, and the provider identifier.
   */
  resolveProvider: (
    context: Context,
    domain: string
  ) => Promise<{ teamId?: string; providerId: string }>;
}

/**
 * Creates a passport strategy that signs users in with an OIDC provider.
 *
 * @param options the configuration of the strategy.
 * @returns the configured strategy.
 */
export function createOIDCStrategy(options: OIDCStrategyOptions): OIDCStrategy {
  const { endpoints, persistLogoutToken, usernameClaim } = options;
  const scopes = options.scopes.split(" ");

  return new OIDCStrategy(
    {
      authorizationURL: endpoints.authorizationURL,
      tokenURL: endpoints.tokenURL,
      clientID: options.clientID,
      clientSecret: options.clientSecret,
      callbackURL: options.callbackURL,
      passReqToCallback: true,
      scope: options.scopes,
      // @ts-expect-error Strategy typings target Express and do not match koa-passport usage
      store: new StateStore(endpoints.pkce),
      state: true,
      pkce: endpoints.pkce ?? false,
    },
    // OpenID Connect standard profile claims can be found in the official
    // specification.
    // https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
    // Non-standard claims may be configured by individual identity providers.
    // Any claim supplied in response to the userinfo request will be
    // available on the `profile` parameter
    async function (
      req: Request,
      accessToken: string,
      refreshToken: string,
      params: { expires_in: number; id_token: string; scope?: string },
      _profile: unknown,
      done: (
        err: Error | null,
        user: User | null,
        result?: AuthenticationResult
      ) => void
    ) {
      const context = req.ctx;
      try {
        // Some providers require a POST request to the userinfo endpoint, add them as exceptions here.
        const usePostMethod = ["https://api.dropboxapi.com/2/openid/userinfo"];

        const profile = await request(
          usePostMethod.includes(endpoints.userInfoURL) ? "POST" : "GET",
          endpoints.userInfoURL,
          accessToken,
          { allowPrivateIPAddress: options.allowPrivateIPAddress }
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
              email_verified?: boolean | string;
              locale?: string;
              preferred_username?: string;
              sub?: string;
            };
          } catch (err) {
            Logger.error("id_token decode threw error: ", toError(err));
            return {};
          }
        })();

        const email = profile.email ?? token.email ?? null;
        const language = getSupportedLanguage(profile.locale, token.locale);

        if (!email) {
          throw AuthenticationError(
            `An email field was not returned in the profile or id_token parameter, but is required.`
          );
        }

        // The email_verified claim is part of the OIDC standard claims.
        // https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
        const emailVerifiedClaim =
          profile.email_verified ?? token.email_verified;
        const emailVerified =
          emailVerifiedClaim === undefined
            ? undefined
            : emailVerifiedClaim === true || emailVerifiedClaim === "true";

        const client = getClientFromOAuthState(context);
        const user =
          context.state?.auth?.user ?? (await getUserFromOAuthState(context));
        const { domain } = parseEmail(email);

        if (!domain) {
          throw OIDCMalformedUserInfoError();
        }

        const { teamId, providerId } = await options.resolveProvider(
          context,
          domain
        );

        // remove the TLD and form a subdomain from the remaining
        const subdomain = slugifyDomain(domain);

        // Claim name can be overridden using an env variable.
        // Default is 'preferred_username' as per OIDC spec.
        // This will default to the profile.preferred_username, but will fall back to preferred_username from the id_token
        const username =
          get(profile, usernameClaim) ?? get(token, usernameClaim);
        const name = profile.name || username || profile.username;
        const profileId = profile.sub ?? token.sub ?? profile.id;

        if (!name) {
          throw AuthenticationError(
            `Neither a ${usernameClaim}, "name" or "username" was returned in the profile loaded from ${endpoints.userInfoURL}, but at least one is required.`
          );
        }
        if (!profileId) {
          throw AuthenticationError(
            `A user id was not returned in the profile loaded from ${endpoints.userInfoURL}, searched in "sub" and "id" fields.`
          );
        }

        // Check if the picture field is a Base64 data URL and filter it out
        // to avoid validation errors in the User model
        let avatarUrl = profile.picture;
        if (profile.picture && isBase64Url(profile.picture)) {
          Logger.debug(
            "authentication",
            "Filtering out Base64 data URL from avatar",
            {
              email,
            }
          );
          avatarUrl = null;
        }

        const ctx = createContext({
          ip: context.ip,
          user,
          authType: context.state?.auth?.type,
        });
        const result = await accountProvisioner(ctx, {
          team: {
            teamId,
            name: env.APP_NAME,
            domain,
            subdomain,
          },
          user: {
            name,
            email,
            emailVerified,
            avatarUrl,
            language,
          },
          authenticationProvider: {
            name: options.name,
            providerId,
          },
          authentication: {
            providerId: profileId,
            accessToken,
            refreshToken,
            expiresIn: params.expires_in,
            scopes: params.scope ? params.scope.split(" ") : scopes,
          },
        });
        // Persist the id_token so a later RP-initiated logout can pass it as
        // the `id_token_hint`, allowing the provider to scope the logout to
        // this session rather than terminating its global SSO session.
        if (persistLogoutToken && endpoints.logoutURL && params.id_token) {
          await persistLogoutToken(context, params.id_token);
        }

        return done(null, result.user, { ...result, client });
      } catch (err) {
        return done(toError(err), null);
      }
    }
  );
}

/**
 * Creates OIDC routes and mounts them into the provided router
 */
export function createOIDCRouter(
  router: Router,
  endpoints: OIDCEndpoints
): void {
  const logoutTokens = new LogoutTokenStore(config.id);

  passport.use(
    config.id,
    withProxyAgent(
      createOIDCStrategy({
        name: config.id,
        endpoints,
        clientID: env.OIDC_CLIENT_ID!,
        clientSecret: env.OIDC_CLIENT_SECRET!,
        callbackURL: `${env.URL}/auth/${config.id}.callback`,
        scopes: env.OIDC_SCOPES,
        usernameClaim: env.OIDC_USERNAME_CLAIM,
        allowPrivateIPAddress: true,
        persistLogoutToken: (context, idToken) =>
          logoutTokens.persist(context, idToken),
        resolveProvider: async (context, domain) => {
          const team = await getTeamFromContext(context);
          const providerId = await resolveProviderId(
            team?.id,
            new URL(endpoints.authorizationURL).hostname,
            domain
          );
          return { teamId: team?.id, providerId };
        },
      })
    )
  );

  router.get(config.id, startOAuthFlow, passport.authenticate(config.id));
  router.register(
    `${config.id}.callback`,
    ["get", "post"],
    passportMiddleware(config.id)
  );

  // Performs a spec-compliant RP-initiated logout against the provider's end
  // session endpoint. Passing `id_token_hint` identifies the session being
  // ended so the provider can scope the logout and skip a confirmation prompt,
  // while `post_logout_redirect_uri` returns the user to Outline afterwards.
  // https://openid.net/specs/openid-connect-rpinitiated-1_0.html
  router.get(`${config.id}.logout`, async (ctx: Context) => {
    const idToken = await logoutTokens.consume(ctx);

    if (!endpoints.logoutURL) {
      return ctx.redirect("/");
    }

    try {
      const url = new URL(endpoints.logoutURL);
      if (idToken) {
        url.searchParams.set("id_token_hint", idToken);
      }
      if (env.OIDC_CLIENT_ID) {
        url.searchParams.set("client_id", env.OIDC_CLIENT_ID);
      }
      url.searchParams.set("post_logout_redirect_uri", env.URL);

      return ctx.redirect(url.toString());
    } catch (err) {
      Logger.warn("Invalid OIDC logout URL", {
        error: toError(err).message,
      });
      return ctx.redirect("/");
    }
  });
}
