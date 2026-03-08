import { Minute } from "@shared/utils/time";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import UploadIntegrationLogoTask from "@server/queues/tasks/UploadIntegrationLogoTask";
import config from "../plugin.json";
import router from "./api/linear";
import env from "./env";
import { Linear } from "./linear";
import LinearBacklinksProcessor from "./processors/LinearBacklinksProcessor";
import SyncLinearBacklinksTask from "./tasks/SyncLinearBacklinksTask";
import { uninstall } from "./uninstall";

const enabled = !!env.LINEAR_CLIENT_ID && !!env.LINEAR_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
    {
      type: Hook.Task,
      value: UploadIntegrationLogoTask,
    },
    {
      type: Hook.UnfurlProvider,
      value: { unfurl: Linear.unfurl, cacheExpiry: Minute.seconds },
    },
    {
      type: Hook.Processor,
      value: LinearBacklinksProcessor,
    },
    {
      type: Hook.Task,
      value: SyncLinearBacklinksTask,
    },
    {
      type: Hook.Uninstall,
      value: uninstall,
    },
  ]);
}
