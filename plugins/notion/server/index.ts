import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/notion";
import env from "./env";

const enabled = !!env.NOTION_CLIENT_ID && !!env.NOTION_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
  ]);
}
