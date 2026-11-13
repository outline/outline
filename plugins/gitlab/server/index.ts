import { IntegrationService } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { GitLabUtils } from "../shared/GitLabUtils";
import { GitLabIssueProvider } from "./GitLabIssueProvider";
import router from "./api/gitlab";
import { GitLabSettingsSchema } from "./api/schema";
import { GitLab } from "./gitlab";
import GitLabWebhookTask from "./tasks/GitLabWebhookTask";

PluginManager.add([
  {
    type: Hook.IntegrationSettings,
    value: {
      service: IntegrationService.GitLab,
      keys: ["gitlab"],
      schema: GitLabSettingsSchema,
    },
  },
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
    name: "GitLab",
    value: { unfurl: GitLab.unfurl, cacheExpiry: Minute.seconds },
  },
  {
    // Only the public host is recognized here, a self-hosted instance is not
    // known without the settings of a connected integration.
    type: Hook.MentionProvider,
    value: (url: URL) => GitLabUtils.mentionType(url),
  },
  {
    type: Hook.Task,
    value: GitLabWebhookTask,
  },
]);
