import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { SlabImportsProcessor } from "./processors/SlabImportsProcessor";
import SlabAPIImportTask from "./tasks/SlabAPIImportTask";

PluginManager.add([
  {
    ...config,
    type: Hook.Processor,
    value: SlabImportsProcessor,
  },
  {
    ...config,
    type: Hook.Task,
    value: SlabAPIImportTask,
  },
]);
