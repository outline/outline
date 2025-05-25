import Router from "koa-router";
import Logger from "@server/logging/Logger";
import env from "../env";
import { fetchOIDCConfiguration } from "../oidcDiscovery";
import { createOIDCRouter } from "./oidcRouter";

// Create router
const router = new Router();

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
  env.OIDC_ISSUER
);

if (hasManualConfig) {
  // Mount endpoints immediately with manual configuration
  createOIDCRouter(router, {
    authorizationURL: env.OIDC_AUTH_URI!,
    tokenURL: env.OIDC_TOKEN_URI!,
    userInfoURL: env.OIDC_USERINFO_URI!,
    logoutURL: env.OIDC_LOGOUT_URI,
  });
  Logger.info("oidc", "OIDC endpoints mounted with manual configuration");
} else if (hasIssuerConfig) {
  // Asynchronously discover configuration and mount endpoints
  void (async () => {
    try {
      Logger.info("oidc", "Starting OIDC configuration discovery");

      const oidcConfig = await fetchOIDCConfiguration(env.OIDC_ISSUER!);

      // Mount endpoints into the existing router
      createOIDCRouter(router, {
        authorizationURL: oidcConfig.authorization_endpoint,
        tokenURL: oidcConfig.token_endpoint,
        userInfoURL: oidcConfig.userinfo_endpoint,
        logoutURL: oidcConfig.end_session_endpoint,
      });

      Logger.info("oidc", "OIDC endpoints mounted after discovery", {
        issuer: oidcConfig.issuer,
        authorization_endpoint: oidcConfig.authorization_endpoint,
        token_endpoint: oidcConfig.token_endpoint,
        userinfo_endpoint: oidcConfig.userinfo_endpoint,
      });
    } catch (error) {
      Logger.error("Failed to discover OIDC configuration", error);
    }
  })();
}

export default router;
