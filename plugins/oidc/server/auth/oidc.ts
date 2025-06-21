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

if (hasManualConfig) {
  // Mount endpoints immediately with manual configuration
  createOIDCRouter(router, {
    authorizationURL: env.OIDC_AUTH_URI!,
    tokenURL: env.OIDC_TOKEN_URI!,
    userInfoURL: env.OIDC_USERINFO_URI!,
    logoutURL: env.OIDC_LOGOUT_URI,
  });
  Logger.info("plugins", "OIDC endpoints mounted with manual configuration");
} else if (hasIssuerConfig) {
  // Asynchronously discover configuration and mount endpoints
  routerPromise = (async () => {
    try {
      Logger.debug("plugins", "Starting OIDC configuration discovery");

      const oidcConfig = await fetchOIDCConfiguration(env.OIDC_ISSUER_URL!);

      // Mount endpoints into the existing router
      createOIDCRouter(router, {
        authorizationURL: oidcConfig.authorization_endpoint,
        tokenURL: oidcConfig.token_endpoint,
        userInfoURL: oidcConfig.userinfo_endpoint,
        logoutURL: oidcConfig.end_session_endpoint,
        pkce: oidcConfig.code_challenge_methods_supported?.includes("S256"),
      });

      Logger.info("plugins", "OIDC endpoints mounted after discovery", {
        issuer: oidcConfig.issuer,
        authorization_endpoint: oidcConfig.authorization_endpoint,
        token_endpoint: oidcConfig.token_endpoint,
        userinfo_endpoint: oidcConfig.userinfo_endpoint,
      });

      return router;
    } catch (error) {
      Logger.fatal("Failed to discover OIDC configuration", error);
      throw error;
    }
  })();
}

export default routerPromise;
