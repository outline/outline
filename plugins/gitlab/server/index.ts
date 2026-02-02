import { Minute } from "@shared/utils/time";
import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/gitlab";
import { GitLab } from "./gitlab";

PluginManager.add([
  {
    ...config,
    type: Hook.API,
    value: router,
  },
  {
    type: Hook.UnfurlProvider,
    value: { unfurl: GitLab.unfurl, cacheExpiry: Minute.seconds },
  },
]);
