import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import BaseTask from "./BaseTask";

const tasks: Record<string, typeof BaseTask> = {};

requireDirectory<{ default: typeof BaseTask }>(__dirname).forEach(
  ([module, id]) => {
    if (id === "index") {
      return;
    }
    tasks[id] = module.default;
  }
);

PluginManager.getHooks(Hook.Task).forEach((hook) => {
  tasks[hook.value.name] = hook.value;
});

export default tasks;
