import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/confluence";
import { Confluence } from "./confluence";

// Always register the plugin - configuration is checked dynamically
PluginManager.add([
  {
    ...config,
    type: Hook.API,
    value: router,
  },
  {
    type: Hook.UnfurlProvider,
    value: { unfurl: Confluence.unfurl, cacheExpiry: Minute.seconds },
  },
]);
