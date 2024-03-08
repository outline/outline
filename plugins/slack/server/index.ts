import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import hooks from "./api/hooks";
import router from "./auth/slack";
import env from "./env";
import SlackProcessor from "./processors/SlackProcessor";

const enabled = !!env.SLACK_CLIENT_ID && !!env.SLACK_CLIENT_SECRET;

PluginManager.register(PluginType.AuthProvider, config.id, router, {
  priority: 40,
  name: config.name,
  enabled,
});

PluginManager.register(PluginType.API, config.id, hooks, {
  enabled,
});

PluginManager.registerProcessor(SlackProcessor, { enabled });
