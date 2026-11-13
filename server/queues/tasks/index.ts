import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import { createLazyRegistry } from "@server/utils/lazyRegistry";
import type { Concrete } from "@shared/types";
import type { BaseTask } from "./base/BaseTask";

const tasks = createLazyRegistry(() => {
  const tasks: Record<string, Concrete<typeof BaseTask<object>>> = {};
  requireDirectory<{ default: Concrete<typeof BaseTask<object>> }>(
    __dirname
  ).forEach(([module, id]) => {
    if (id === "index") {
      return;
    }
    tasks[id] = module.default;
  });
  PluginManager.getHooks(Hook.Task).forEach((hook) => {
    tasks[hook.value.name] = hook.value;
  });
  return tasks;
});

export default tasks;
