import { IntegrationService } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/github";
import env from "./env";
import { GitHub } from "./github";
import { GitHubIssueProvider } from "./issue";
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
      value: { unfurl: GitHub.unfurl, cacheExpiry: Minute.seconds },
    },
    {
      type: Hook.IssueProvider,
      value: {
        provider: {
          listSources: GitHubIssueProvider.listRepos,
          createIssue: GitHubIssueProvider.createIssue,
        },
        service: IntegrationService.GitHub,
        cacheExpiry: Minute.seconds,
      },
    },
    {
      type: Hook.Uninstall,
      value: uninstall,
    },
  ]);
}
