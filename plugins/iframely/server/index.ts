import { Day } from "@shared/utils/time";
import {
  PluginManager,
  PluginPriority,
  Hook,
} from "@server/utils/PluginManager";
import env from "./env";
import Iframely from "./iframely";

const isDefaultHost = env.IFRAMELY_URL === Iframely.defaultUrl;

// To be considered enabled either we're using the default (cloud) host and have an API key,
// or we're using a custom host where no API key is required.
const enabled =
  (isDefaultHost && !!env.IFRAMELY_API_KEY) ||
  (!isDefaultHost && !!env.IFRAMELY_URL);

if (enabled) {
  PluginManager.add([
    {
      type: Hook.UnfurlProvider,
      value: { unfurl: Iframely.unfurl, cacheExpiry: Day.seconds },

      // Make sure this is last in the stack to be evaluated after all other unfurl providers
      priority: PluginPriority.VeryLow,
    },
  ]);
}
