import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/oidc";
import env from "./env";

PluginManager.register(PluginType.AuthProvider, router, {
  ...config,
  name: env.OIDC_DISPLAY_NAME || config.name,
  enabled: !!(
    env.OIDC_CLIENT_ID &&
    env.OIDC_CLIENT_SECRET &&
    env.OIDC_AUTH_URI &&
    env.OIDC_TOKEN_URI &&
    env.OIDC_USERINFO_URI
  ),
});
