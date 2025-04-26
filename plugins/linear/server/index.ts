import { Minute } from "@shared/utils/time";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/linear";
import env from "./env";
import { Linear } from "./linear";
import UploadLinearWorkspaceLogoTask from "./tasks/UploadLinearWorkspaceLogoTask";
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
      value: UploadLinearWorkspaceLogoTask,
    },
    {
      type: Hook.UnfurlProvider,
      value: { unfurl: Linear.unfurl, cacheExpiry: Minute.seconds },
    },
    {
      type: Hook.Uninstall,
      value: uninstall,
    },
  ]);
}
