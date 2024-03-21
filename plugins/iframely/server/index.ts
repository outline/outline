import { Day } from "@shared/utils/time";
import {
  PluginManager,
  PluginPriority,
  Hook,
} from "@server/utils/PluginManager";
import env from "./env";
import Iframely from "./iframely";

const isDefaultHost = env.IFRAMELY_URL === Iframely.defaultUrl;
const enabled = (isDefaultHost && !!env.IFRAMELY_API_KEY) || !!env.IFRAMELY_URL;

if (enabled) {
  PluginManager.add([
    {
      type: Hook.UnfurlProvider,
      value: { unfurl: Iframely.unfurl, cacheExpiry: Day },

      // Make sure this is last in the stack to be evaluated after all other unfurl providers
      priority: PluginPriority.VeryLow,
    },
  ]);
}
