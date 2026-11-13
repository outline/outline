import { IntegrationService } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { GitHubUtils } from "../shared/GitHubUtils";
import { GitHubIssueProvider } from "./GitHubIssueProvider";
import router from "./api/github";
import env from "./env";
import { GitHub } from "./github";
import GitHubWebhookTask from "./tasks/GitHubWebhookTask";
import { uninstall } from "./uninstall";

PluginManager.add({
  type: Hook.IntegrationSettings,
  value: { service: IntegrationService.GitHub, keys: ["github"] },
});

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
      type: Hook.Task,
      value: GitHubWebhookTask,
    },
    {
      type: Hook.IssueProvider,
      value: new GitHubIssueProvider(),
    },
    {
      type: Hook.UnfurlProvider,
      name: "GitHub",
      value: { unfurl: GitHub.unfurl, cacheExpiry: Minute.seconds },
    },
    {
      type: Hook.MentionProvider,
      value: (url: URL) => GitHubUtils.mentionType(url),
    },
    {
      type: Hook.Uninstall,
      value: uninstall,
    },
  ]);
}
