import Router from "koa-router";
import Logger from "@server/logging/Logger";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/oidc";
import { createOIDCRouter } from "./auth/oidcRouter";
import env from "./env";
import { fetchOIDCConfiguration } from "./oidcDiscovery";

// Check if OIDC is enabled with either manual configuration or issuer URL
const hasManualConfig = !!(
  env.OIDC_CLIENT_ID &&
  env.OIDC_CLIENT_SECRET &&
  env.OIDC_AUTH_URI &&
  env.OIDC_TOKEN_URI &&
  env.OIDC_USERINFO_URI
);

const hasIssuerConfig = !!(
  env.OIDC_CLIENT_ID &&
  env.OIDC_CLIENT_SECRET &&
  env.OIDC_ISSUER
);

const enabled = hasManualConfig || hasIssuerConfig;

if (enabled) {
  if (hasManualConfig) {
    // Register plugin immediately with manual configuration
    PluginManager.add({
      ...config,
      type: Hook.AuthProvider,
      value: { router, id: config.id },
      name: env.OIDC_DISPLAY_NAME || config.name,
    });
    Logger.info("oidc", "OIDC plugin registered with manual configuration");
  } else if (hasIssuerConfig) {
    // Create empty router and register plugin immediately
    const discoveryRouter = new Router();
    PluginManager.add({
      ...config,
      type: Hook.AuthProvider,
      value: { router: discoveryRouter, id: config.id },
      name: env.OIDC_DISPLAY_NAME || config.name,
    });

    // Asynchronously discover configuration and mount endpoints
    void (async () => {
      try {
        Logger.info("oidc", "Starting OIDC configuration discovery");

        const oidcConfig = await fetchOIDCConfiguration(env.OIDC_ISSUER!);

        // Mount endpoints into the existing router
        createOIDCRouter(discoveryRouter, {
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
}
