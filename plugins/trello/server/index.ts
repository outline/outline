import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/trello";
import env from "./env";
import { Trello } from "./trello";

const enabled = !!env.TRELLO_API_KEY && !!env.TRELLO_API_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
    {
      type: Hook.UnfurlProvider,
      value: { unfurl: Trello.unfurl, cacheExpiry: Minute.seconds },
    },
  ]);
}
