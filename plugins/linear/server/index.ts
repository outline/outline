import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/linear";
import env from "./env";

const enabled = !!env.LINEAR_CLIENT_ID && !!env.LINEAR_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
  ]);
}
