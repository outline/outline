import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/github";
import env from "./env";
import { githubApp } from "./github";
import { uninstall } from "./uninstall";

const enabled =
  !!env.GITHUB_CLIENT_ID &&
  !!env.GITHUB_CLIENT_SECRET &&
  !!env.GITHUB_APP_NAME &&
  !!env.GITHUB_APP_ID &&
  !!env.GITHUB_APP_PRIVATE_KEY;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
    {
      type: Hook.UnfurlProvider,
      value: { unfurl: githubApp.unfurl, cacheExpiry: Minute },
    },
    {
      type: Hook.Uninstall,
      value: uninstall,
    },
  ]);
}
