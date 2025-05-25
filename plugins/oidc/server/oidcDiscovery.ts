import Logger from "@server/logging/Logger";
import fetch from "@server/utils/fetch";

export interface OIDCConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri?: string;
  end_session_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
}

/**
 * Fetches OIDC configuration from the well-known endpoint
 * @param issuerUrl The OIDC issuer URL
 * @returns Promise resolving to the OIDC configuration
 */
export async function fetchOIDCConfiguration(
  issuerUrl: string
): Promise<OIDCConfiguration> {
  try {
    // Ensure the issuer URL doesn't end with a slash
    const normalizedIssuer = issuerUrl.replace(/\/$/, "");
    const wellKnownUrl = `${normalizedIssuer}/.well-known/openid-configuration`;

    Logger.info("oidc", `Fetching OIDC configuration from ${wellKnownUrl}`);

    const response = await fetch(wellKnownUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Outline/1.0",
      },
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OIDC configuration: ${response.status} ${response.statusText}`
      );
    }

    const config = (await response.json()) as OIDCConfiguration;

    // Validate required endpoints are present
    if (!config.authorization_endpoint) {
      throw new Error("Missing authorization_endpoint in OIDC configuration");
    }
    if (!config.token_endpoint) {
      throw new Error("Missing token_endpoint in OIDC configuration");
    }
    if (!config.userinfo_endpoint) {
      throw new Error("Missing userinfo_endpoint in OIDC configuration");
    }

    Logger.info("oidc", "Successfully fetched OIDC configuration", {
      issuer: config.issuer,
      authorization_endpoint: config.authorization_endpoint,
      token_endpoint: config.token_endpoint,
      userinfo_endpoint: config.userinfo_endpoint,
    });

    return config;
  } catch (error) {
    Logger.error("Failed to fetch OIDC configuration", error);
    throw error;
  }
}
