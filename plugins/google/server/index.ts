import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/google";
import env from "./env";

PluginManager.register(PluginType.AuthProvider, router, {
  ...config,
  enabled: !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET,
});
