import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import GoogleGroupSyncProvider from "./GoogleGroupSyncProvider";
import router from "./auth/google";
import env from "./env";

const enabled = !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.AuthProvider,
      value: { router, id: config.id },
    },
    {
      ...config,
      type: Hook.GroupSyncProvider,
      value: { id: config.id, provider: new GoogleGroupSyncProvider() },
    },
  ]);
}
