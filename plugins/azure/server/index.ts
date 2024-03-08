import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/azure";
import env from "./env";

PluginManager.register(PluginType.AuthProvider, router, {
  ...config,
  enabled: !!env.AZURE_CLIENT_ID && !!env.AZURE_CLIENT_SECRET,
});
