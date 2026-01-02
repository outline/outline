import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/figma";
import env from "./env";
import { uninstall } from "./uninstall";

const enabled = !!env.FIGMA_CLIENT_ID && !!env.FIGMA_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
    {
      type: Hook.Uninstall,
      value: uninstall,
    },
  ]);
}
