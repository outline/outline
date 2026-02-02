import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/bitrix24";
import { Bitrix24 } from "./bitrix24";

PluginManager.add([
  {
    ...config,
    type: Hook.API,
    value: router,
  },
  {
    type: Hook.UnfurlProvider,
    value: { unfurl: Bitrix24.unfurl, cacheExpiry: Minute.seconds },
  },
]);
