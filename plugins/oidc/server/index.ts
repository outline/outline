import Logger from "@server/logging/Logger";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import OIDCClient from "./oidc";
import router from "./auth/oidc";
import customRouter from "./auth/customOIDC";
import {
  CUSTOM_OIDC_ID,
  configureCustomOIDC,
  customOIDCCallbackUrl,
} from "./customOIDC";
import env from "./env";

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
  env.OIDC_ISSUER_URL
);

const enabled = hasManualConfig || hasIssuerConfig;

if (enabled) {
  // Register plugin with the router (which handles both manual and discovery config)
  PluginManager.add([
    {
      ...config,
      type: Hook.AuthProvider,
      value: {
        router,
        id: config.id,
        oauthClient: () => new OIDCClient(),
      },
      name: env.OIDC_DISPLAY_NAME || config.name,
    },
  ]);
  Logger.info("plugins", "OIDC plugin registered");
}

PluginManager.add([
  {
    type: Hook.AuthProvider,
    name: "OpenID Connect",
    description:
      "Adds OpenID compatible authentication providers configured by admins.",
    priority: 150,
    value: {
      router: customRouter,
      id: CUSTOM_OIDC_ID,
      oauthClient: (authenticationProvider) =>
        new OIDCClient(authenticationProvider.config),
      configure: configureCustomOIDC,
      callbackUrl: customOIDCCallbackUrl,
    },
  },
]);
