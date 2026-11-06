import passport from "@outlinewiki/koa-passport";
import Router from "@koa/router";
import { addMinutes, subMinutes } from "date-fns";
import type { Context, Next } from "koa";
import { isUUID } from "validator";
import { getCookieDomain } from "@shared/utils/domains";
import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import passportMiddleware from "@server/middlewares/passport";
import { AuthenticationProvider } from "@server/models";
import { LogoutTokenStore } from "@server/utils/LogoutTokenStore";
import { startOAuthFlow, withProxyAgent } from "@server/utils/passport";
import {
  RequestFilteringHttpAgent,
  RequestFilteringHttpsAgent,
} from "@server/utils/requestFilteringAgent";
import env from "@server/env";
import { CUSTOM_OIDC_ID, customOIDCCallbackUrl } from "../customOIDC";
import type { OIDCStrategy } from "./OIDCStrategy";
import { createOIDCStrategy } from "./oidcRouter";

/** Remembers which provider a sign-in was started with until the callback. */
const PROVIDER_COOKIE = "oidc_custom_provider";

const logoutTokens = new LogoutTokenStore(CUSTOM_OIDC_ID);

const router = new Router();

router.get(
  `${CUSTOM_OIDC_ID}/:id`,
  startOAuthFlow,
  async (ctx: Context, next: Next) => {
    const provider = await findProvider(ctx.params.id);
    if (!provider) {
      return ctx.redirect("/?notice=auth-error");
    }

    ctx.cookies.set(PROVIDER_COOKIE, provider.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: ctx.request.secure,
      expires: addMinutes(new Date(), 10),
      domain: getCookieDomain(ctx.hostname, env.isCloudHosted),
    });

    return passport.authenticate(createStrategy(provider))(ctx, next);
  }
);

router.register(
  `${CUSTOM_OIDC_ID}.callback`,
  ["get", "post"],
  async (ctx: Context) => {
    const providerId = ctx.cookies.get(PROVIDER_COOKIE);
    ctx.cookies.set(PROVIDER_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: ctx.request.secure,
      expires: subMinutes(new Date(), 1),
      domain: getCookieDomain(ctx.hostname, env.isCloudHosted),
    });

    const provider = providerId ? await findProvider(providerId) : null;
    if (!provider) {
      Logger.warn("OIDC callback received without a known provider");
      return ctx.redirect("/?notice=auth-error");
    }

    return passportMiddleware(CUSTOM_OIDC_ID, createStrategy(provider))(ctx);
  }
);

// Performs an RP-initiated logout against the end session endpoint of the
// provider that the session was signed in with.
// https://openid.net/specs/openid-connect-rpinitiated-1_0.html
router.get(`${CUSTOM_OIDC_ID}.logout`, async (ctx: Context) => {
  const stored = parseLogoutToken(await logoutTokens.consume(ctx));
  const provider = stored
    ? await findProvider(stored.authenticationProviderId)
    : null;
  const config = provider?.config;

  if (!stored || !config?.logoutUrl) {
    return ctx.redirect("/");
  }

  try {
    const url = new URL(config.logoutUrl);
    url.searchParams.set("id_token_hint", stored.idToken);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("post_logout_redirect_uri", env.URL);
    return ctx.redirect(url.toString());
  } catch (err) {
    Logger.warn("Invalid OIDC logout URL", {
      error: toError(err).message,
    });
    return ctx.redirect("/");
  }
});

/**
 * Parses a stored logout token.
 *
 * @param value the stored value.
 * @returns the provider id and id token, or null if invalid.
 */
function parseLogoutToken(
  value: string | null
): { authenticationProviderId: string; idToken: string } | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (
      typeof parsed?.authenticationProviderId === "string" &&
      typeof parsed?.idToken === "string"
    ) {
      return parsed;
    }
  } catch {
    // Ignore malformed values.
  }
  return null;
}

/**
 * Loads a configured OIDC provider by id.
 *
 * @param id the id of the authentication provider.
 * @returns the provider, or null if it does not exist or is not configured.
 */
async function findProvider(id: string) {
  if (!isUUID(id)) {
    return null;
  }

  const provider = await AuthenticationProvider.findOne({
    where: { id, name: CUSTOM_OIDC_ID },
  });
  return provider?.config ? provider : null;
}

/**
 * Creates a strategy that signs in with the given configured provider.
 *
 * @param provider the authentication provider to sign in with.
 * @returns the strategy.
 */
function createStrategy(provider: AuthenticationProvider) {
  const config = provider.config!;
  const strategy = createOIDCStrategy({
    name: CUSTOM_OIDC_ID,
    endpoints: {
      authorizationURL: config.authorizationUrl,
      tokenURL: config.tokenUrl,
      userInfoURL: config.userInfoUrl,
      logoutURL: config.logoutUrl,
      pkce: config.pkce,
    },
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: customOIDCCallbackUrl(),
    scopes: config.scopes,
    usernameClaim: config.usernameClaim,
    allowPrivateIPAddress: !env.isCloudHosted,
    persistLogoutToken: (context, idToken) =>
      logoutTokens.persist(
        context,
        JSON.stringify({ authenticationProviderId: provider.id, idToken })
      ),
    resolveProvider: async () => ({
      teamId: provider.teamId,
      providerId: provider.providerId,
    }),
  });

  return withRequestFiltering(withProxyAgent(strategy), config.tokenUrl);
}

/**
 * Prevents the token exchange from reaching private IP addresses on cloud
 * hosted installations, where endpoints are entered by workspace admins.
 *
 * @param strategy the strategy to configure.
 * @param tokenUrl the token endpoint of the provider.
 * @returns the same strategy.
 */
function withRequestFiltering(strategy: OIDCStrategy, tokenUrl: string) {
  const proxy = process.env.https_proxy ?? process.env.HTTPS_PROXY;
  if (!env.isCloudHosted || proxy) {
    return strategy;
  }

  const options = {
    allowPrivateIPAddress: false,
    allowIPAddressList: env.ALLOWED_PRIVATE_IP_ADDRESSES ?? [],
  };

  // @ts-expect-error _oauth2 is not part of the public strategy type
  strategy._oauth2.setAgent(
    tokenUrl.startsWith("https:")
      ? new RequestFilteringHttpsAgent(options)
      : new RequestFilteringHttpAgent(options)
  );
  return strategy;
}

export default router;
