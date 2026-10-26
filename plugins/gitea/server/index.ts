import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { GiteaIssueProvider } from "./GiteaIssueProvider";
import router from "./api/gitea";
import { Gitea } from "./gitea";

PluginManager.add([
  {
    ...config,
    type: Hook.API,
    value: router,
  },
  {
    type: Hook.IssueProvider,
    value: new GiteaIssueProvider(),
  },
  {
    type: Hook.UnfurlProvider,
    name: "Gitea",
    value: { unfurl: Gitea.unfurl, cacheExpiry: Minute.seconds },
  },
]);
