import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/notion";
import env from "./env";
import ImportNotionTaskV2 from "./tasks/ImportNotionTaskV2";

const enabled = !!env.NOTION_CLIENT_ID && !!env.NOTION_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
    {
      type: Hook.Task,
      value: ImportNotionTaskV2,
    },
  ]);
}
