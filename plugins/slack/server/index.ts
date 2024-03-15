import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import hooks from "./api/hooks";
import router from "./auth/slack";
import env from "./env";
import SlackProcessor from "./processors/SlackProcessor";

const enabled = !!env.SLACK_CLIENT_ID && !!env.SLACK_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: PluginType.AuthProvider,
      value: { router, id: config.id },
    },
    {
      ...config,
      type: PluginType.API,
      value: hooks,
    },
    {
      type: PluginType.Processor,
      value: SlackProcessor,
    },
  ]);
}
