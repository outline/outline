import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { GitLabIssueProvider } from "./GitLabIssueProvider";
import router from "./api/gitlab";
import env from "./env";
import { GitLab } from "./gitlab";
import { uninstall } from "./uninstall";

const enabled = !!env.GITLAB_CLIENT_ID && !!env.GITLAB_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
    {
      type: Hook.IssueProvider,
      value: new GitLabIssueProvider(),
    },
    {
      type: Hook.UnfurlProvider,
      value: { unfurl: GitLab.unfurl, cacheExpiry: Minute.seconds },
    },
    {
      type: Hook.Uninstall,
      value: uninstall,
    },
  ]);
}
