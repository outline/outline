import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/jira";
import env from "./env";
import { Jira } from "./jira";

const enabled =
  !!env.JIRA_URL && !!env.JIRA_CONSUMER_KEY && !!env.JIRA_CONSUMER_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
    {
      type: Hook.UnfurlProvider,
      value: { unfurl: Jira.unfurl, cacheExpiry: Minute.seconds },
    },
  ]);
}
