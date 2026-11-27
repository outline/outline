import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./auth/slack";
import env from "./env";
import { SlackChatProvider } from "./SlackChatProvider";

const enabled = !!env.SLACK_CLIENT_ID && !!env.SLACK_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.AuthProvider,
      value: { router, id: config.id },
    },
    {
      ...config,
      type: Hook.ChatProvider,
      value: new SlackChatProvider(),
    },
  ]);
}
