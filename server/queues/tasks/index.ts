import { PluginManager, PluginType } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import BaseTask from "./BaseTask";

const tasks = {};

requireDirectory<{ default: BaseTask<any> }>(__dirname).forEach(
  ([module, id]) => {
    if (id === "index") {
      return;
    }
    tasks[id] = module.default;
  }
);

PluginManager.getEnabledPlugins(PluginType.Processor).forEach((plugin) => {
  tasks[plugin.id] = plugin.value;
});

export default tasks;
