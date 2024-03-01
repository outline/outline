import {
  PluginManager,
  PluginPriority,
  PluginType,
} from "@server/utils/PluginManager";
import config from "../plugin.json";
import env from "./env";
import Iframely from "./iframely";

PluginManager.register(PluginType.UnfurlProvider, config.id, Iframely.get, {
  enabled: !!env.IFRAMELY_API_KEY && !!env.IFRAMELY_URL,

  // Make sure this is last in the stack to be evaluated
  priority: PluginPriority.VeryLow,
});
