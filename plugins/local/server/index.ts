import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/local";
import env from "./env";

// Enable local auth if LOCAL_AUTH_ENABLED is set or if in development
const enabled = env.LOCAL_AUTH_ENABLED || env.isDevelopment;

if (enabled) {
  PluginManager.add({
    ...config,
    type: Hook.AuthProvider,
    value: { router, id: config.id },
  });
}
