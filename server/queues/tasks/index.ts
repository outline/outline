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

PluginManager.getPlugins(PluginType.Task).forEach((plugin) => {
  tasks[plugin.value.name] = plugin.value;
});

export default tasks;
