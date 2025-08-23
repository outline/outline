import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { JiraIssueProvider } from "./JiraIssueProvider";
import env from "./env";
import { Jira } from "./jira";
import { uninstall } from "./uninstall";
import Logger from "@server/logging/Logger";

const enabled = !!env.JIRA_URL && !!env.JIRA_EMAIL && !!env.JIRA_APP_TOKEN;

if (enabled) {
  // Initialize Jira client
  try {
    Jira.initialize();

    PluginManager.add([
      {
        ...config,
        type: Hook.IssueProvider,
        value: new JiraIssueProvider(),
      },
      {
        type: Hook.UnfurlProvider,
        value: {
          unfurl: async (url: string, user: unknown) => {
            try {
              const result = await Jira.unfurl(url, user);
              return result || undefined;
            } catch (error) {
              return {
                error: error.message,
              };
            }
          },
          cacheExpiry: Minute.seconds,
        },
      },
      {
        type: Hook.Uninstall,
        value: uninstall,
      },
    ]);
  } catch (error) {
    Logger.error("Failed to initialize Jira integration", {
      error: error.message,
    });
  }
}
