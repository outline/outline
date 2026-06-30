import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { ObsidianImportsProcessor } from "./processors/ObsidianImportsProcessor";
import ObsidianAPIImportTask from "./tasks/ObsidianAPIImportTask";

PluginManager.add([
  {
    ...config,
    type: Hook.Processor,
    value: ObsidianImportsProcessor,
  },
  {
    ...config,
    type: Hook.Task,
    value: ObsidianAPIImportTask,
  },
]);
