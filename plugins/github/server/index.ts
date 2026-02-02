import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { GitHubIssueProvider } from "./GitHubIssueProvider";
import router from "./api/github";
import { GitHub } from "./github";
import GitHubWebhookTask from "./tasks/GitHubWebhookTask";
import { uninstall } from "./uninstall";

const enabled = false;

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
      value: { unfurl: GitHub.unfurl, cacheExpiry: Minute.seconds },
    },
    {
      type: Hook.Uninstall,
      value: uninstall,
    },
  ]);
}
