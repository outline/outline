import Router from "koa-router";
import Logger from "@server/logging/Logger";
import env from "../env";
import { fetchOIDCConfiguration } from "../oidcDiscovery";
import { createOIDCRouter } from "./oidcRouter";

const router = new Router();
let routerPromise = Promise.resolve(router);

// Check if we have manual configuration
const hasManualConfig = !!(
  env.OIDC_CLIENT_ID &&
  env.OIDC_CLIENT_SECRET &&
  env.OIDC_AUTH_URI &&
  env.OIDC_TOKEN_URI &&
  env.OIDC_USERINFO_URI
);

// Check if we have issuer configuration for discovery
const hasIssuerConfig = !!(
  env.OIDC_CLIENT_ID &&
  env.OIDC_CLIENT_SECRET &&
  env.OIDC_ISSUER_URL
);

/**
 * Determine the authentication method based on environment variable and discovery response
 */
function determineAuthMethod(
  discoveryAuthMethods?: string[]
): "client_secret_basic" | "client_secret_post" {
  // Environment variable override
  if (env.OIDC_TOKEN_ENDPOINT_AUTH_METHOD) {
    const method = env.OIDC_TOKEN_ENDPOINT_AUTH_METHOD;
    if (method === "client_secret_basic" || method === "client_secret_post") {
      Logger.debug("plugins", "Using authentication method from environment", {
        authMethod: method,
      });
      return method;
    }
    Logger.warn("Invalid Environment variable OIDC_TOKEN_ENDPOINT_AUTH_METHOD, using default", {
      provided: method,
      valid: ["client_secret_basic", "client_secret_post"]
    });
  }

  // Discovery response
  if (discoveryAuthMethods && discoveryAuthMethods.length > 0) {
    // Prefer client_secret_basic if supported, otherwise use client_secret_post
    if (discoveryAuthMethods.includes("client_secret_basic")) {
      Logger.debug("plugins", "Using client_secret_basic from discovery");
      return "client_secret_basic";
    }
    if (discoveryAuthMethods.includes("client_secret_post")) {
      Logger.debug("plugins", "Using client_secret_post from discovery");
      return "client_secret_post";
    }
  }

  // Default use client_secret_post
  Logger.debug("plugins", "Using default authentication method: client_secret_post");
  return "client_secret_post";
}

if (hasManualConfig) {
  // Mount endpoints immediately with manual configuration
  const authMethod = determineAuthMethod();

  createOIDCRouter(router, {
    authorizationURL: env.OIDC_AUTH_URI!,
    tokenURL: env.OIDC_TOKEN_URI!,
    userInfoURL: env.OIDC_USERINFO_URI!,
    logoutURL: env.OIDC_LOGOUT_URI,
    authMethod: authMethod,
  });
  Logger.info("plugins", "OIDC endpoints mounted with manual configuration");
} else if (hasIssuerConfig) {
  // Asynchronously discover configuration and mount endpoints
  routerPromise = (async () => {
    try {
      Logger.debug("plugins", "Starting OIDC configuration discovery");

      const oidcConfig = await fetchOIDCConfiguration(env.OIDC_ISSUER_URL!);

      // Set environment variables for OIDC endpoints so they can be read by OIDC OAuth class
      env.OIDC_AUTH_URI = oidcConfig.authorization_endpoint;
      env.OIDC_TOKEN_URI = oidcConfig.token_endpoint;
      env.OIDC_USERINFO_URI = oidcConfig.userinfo_endpoint;

      // Determine authentication method from discovery or environment
      const authMethod = determineAuthMethod(
        oidcConfig.token_endpoint_auth_methods_supported
      );

      // Mount endpoints into the existing router
      createOIDCRouter(router, {
        authorizationURL: oidcConfig.authorization_endpoint,
        tokenURL: oidcConfig.token_endpoint,
        userInfoURL: oidcConfig.userinfo_endpoint,
        logoutURL: oidcConfig.end_session_endpoint,
        pkce: oidcConfig.code_challenge_methods_supported?.includes("S256"),
        authMethod: authMethod,
      });

      Logger.info("plugins", "OIDC endpoints mounted after discovery", {
        issuer: oidcConfig.issuer,
        authorization_endpoint: oidcConfig.authorization_endpoint,
        token_endpoint: oidcConfig.token_endpoint,
        userinfo_endpoint: oidcConfig.userinfo_endpoint,
        authMethod: authMethod,
      });

      return router;
    } catch (error) {
      Logger.fatal("Failed to discover OIDC configuration", error);
      throw error;
    }
  })();
}

export default routerPromise;
