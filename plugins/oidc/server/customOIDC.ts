import type { AuthenticationProviderConfig } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { ValidationError } from "@server/errors";
import type { AuthenticationProviderConfigInput } from "@server/routes/api/authenticationProviders/schema";
import { validateUrlNotPrivate } from "@server/utils/url";
import env from "@server/env";
import { fetchOIDCConfiguration } from "./oidcDiscovery";

/** The name of OIDC providers that are configured by an admin. */
export const CUSTOM_OIDC_ID = "oidc-custom";

/** The scopes requested when none are configured. */
const DefaultScopes = "openid profile email";

/** The claim used as the display name when none is configured. */
const DefaultUsernameClaim = "preferred_username";

/**
 * Returns the URL that identity providers redirect back to after sign-in.
 *
 * @returns the callback URL.
 */
export function customOIDCCallbackUrl() {
  return `${env.URL}/auth/${CUSTOM_OIDC_ID}.callback`;
}

/**
 * Resolves admin input into the stored configuration of an OIDC provider,
 * discovering endpoints from the issuer when one is given.
 *
 * @param input the configuration entered by the admin.
 * @param existing the currently stored configuration, if updating.
 * @returns the external identifier and configuration to store.
 * @throws {ValidationError} if the configuration is incomplete or invalid.
 */
export async function configureCustomOIDC(
  input: AuthenticationProviderConfigInput,
  existing?: AuthenticationProviderConfig | null
): Promise<{ providerId: string; config: AuthenticationProviderConfig }> {
  const allowPrivateIPAddress = !env.isCloudHosted;
  const clientSecret = input.clientSecret ?? existing?.clientSecret;

  if (!clientSecret) {
    throw ValidationError("A client secret is required");
  }

  let endpoints: Pick<
    AuthenticationProviderConfig,
    "authorizationUrl" | "tokenUrl" | "userInfoUrl" | "logoutUrl" | "pkce"
  >;
  let providerId: string;

  if (input.issuerUrl) {
    let discovered;
    try {
      discovered = await fetchOIDCConfiguration(input.issuerUrl, {
        allowPrivateIPAddress,
      });
    } catch (err) {
      throw ValidationError(
        `Could not load the OpenID configuration from the issuer: ${errToString(err)}`
      );
    }

    endpoints = {
      authorizationUrl: discovered.authorization_endpoint,
      tokenUrl: discovered.token_endpoint,
      userInfoUrl: discovered.userinfo_endpoint,
      logoutUrl: discovered.end_session_endpoint,
      pkce: !!discovered.code_challenge_methods_supported?.includes("S256"),
    };
    providerId = discovered.issuer || input.issuerUrl;
  } else {
    if (!input.authorizationUrl || !input.tokenUrl || !input.userInfoUrl) {
      throw ValidationError(
        "An issuer URL, or the authorization, token, and userinfo endpoints are required"
      );
    }

    endpoints = {
      authorizationUrl: input.authorizationUrl,
      tokenUrl: input.tokenUrl,
      userInfoUrl: input.userInfoUrl,
      logoutUrl: input.logoutUrl,
      pkce: false,
    };
    providerId = input.authorizationUrl;
  }

  const urls = [
    endpoints.authorizationUrl,
    endpoints.tokenUrl,
    endpoints.userInfoUrl,
    endpoints.logoutUrl,
  ].filter((url): url is string => !!url);

  for (const url of urls) {
    assertHttpUrl(url);
  }

  // The server requests the token and userinfo endpoints directly.
  if (!allowPrivateIPAddress) {
    await validateUrlNotPrivate(endpoints.tokenUrl);
    await validateUrlNotPrivate(endpoints.userInfoUrl);
  }

  if (providerId.length > 255) {
    throw ValidationError("The issuer must be 255 characters or less");
  }

  return {
    providerId,
    config: {
      displayName: input.displayName,
      issuerUrl: input.issuerUrl,
      ...endpoints,
      clientId: input.clientId,
      clientSecret,
      scopes: input.scopes || DefaultScopes,
      usernameClaim: input.usernameClaim || DefaultUsernameClaim,
    },
  };
}

/**
 * Asserts that a URL uses the http or https protocol.
 *
 * @param url the URL to check.
 * @throws {ValidationError} if the URL is invalid or uses another protocol.
 */
function assertHttpUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw ValidationError(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw ValidationError(`URL must use http or https: ${url}`);
  }
}
