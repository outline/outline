import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/azure";
import env from "./env";

const enabled = !!env.AZURE_CLIENT_ID && !!env.AZURE_CLIENT_SECRET;

if (enabled) {
  PluginManager.add({
    ...config,
    type: Hook.AuthProvider,
    value: { router, id: config.id },
  });
}
