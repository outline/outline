import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/oidc";
import env from "./env";

PluginManager.register(PluginType.AuthProvider, config.id, router, {
  name: env.OIDC_DISPLAY_NAME || config.name,
  description: config.description,
  enabled: !!(
    env.OIDC_CLIENT_ID &&
    env.OIDC_CLIENT_SECRET &&
    env.OIDC_AUTH_URI &&
    env.OIDC_TOKEN_URI &&
    env.OIDC_USERINFO_URI
  ),
});
