import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/password";

PluginManager.add({
  ...config,
  type: Hook.AuthProvider,
  value: { router, id: config.id },
});
