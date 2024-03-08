import {
  PluginManager,
  PluginPriority,
  PluginType,
} from "@server/utils/PluginManager";
import env from "./env";
import Iframely from "./iframely";

PluginManager.register(PluginType.UnfurlProvider, Iframely.get, {
  id: "iframely",
  enabled: !!env.IFRAMELY_API_KEY && !!env.IFRAMELY_URL,

  // Make sure this is last in the stack to be evaluated after all other unfurl providers
  priority: PluginPriority.VeryLow,
});
