import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/adfs";
import env from "./env";

const enabled = !!(
  env.ADFS_CLIENT_ID &&
  env.ADFS_CLIENT_SECRET &&
  env.ADFS_AUTH_URI &&
  env.ADFS_TOKEN_URI &&
  env.ADFS_USERINFO_URI
);

if (enabled) {
  PluginManager.add({
    ...config,
    type: Hook.AuthProvider,
    value: { router, id: config.id },
    name: env.ADFS_DISPLAY_NAME || config.name,
  });
}
