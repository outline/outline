import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { BitbucketIssueProvider } from "./BitbucketIssueProvider";
import env from "./env";
import { Bitbucket } from "./bitbucket";
import { uninstall } from "./uninstall";
import Logger from "@server/logging/Logger";

const enabled = !!env.BITBUCKET_USERNAME && !!env.BITBUCKET_APP_PASSWORD;

if (enabled) {
  // Initialize Bitbucket client
  try {
    Bitbucket.initialize();

    PluginManager.add([
      {
        ...config,
        type: Hook.IssueProvider,
        value: new BitbucketIssueProvider(),
      },
      {
        type: Hook.UnfurlProvider,
        value: {
          unfurl: async (url: string, user: unknown) =>
            Bitbucket.unfurl(url, user),
          cacheExpiry: Minute.seconds,
        },
      },
      {
        type: Hook.Uninstall,
        value: uninstall,
      },
    ]);
  } catch (error) {
    Logger.error("Failed to initialize Bitbucket integration", {
      error: error.message,
    });
  }
}
