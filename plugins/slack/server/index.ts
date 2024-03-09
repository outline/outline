import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import hooks from "./api/hooks";
import router from "./auth/slack";
import env from "./env";
import SlackProcessor from "./processors/SlackProcessor";

const enabled = !!env.SLACK_CLIENT_ID && !!env.SLACK_CLIENT_SECRET;

PluginManager.register(PluginType.AuthProvider, router, {
  ...config,
  enabled,
});

PluginManager.register(PluginType.API, hooks, {
  ...config,
  enabled,
});

PluginManager.registerProcessor(SlackProcessor, { enabled });
