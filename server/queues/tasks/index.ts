import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import type { BaseTask } from "./base/BaseTask";

let cache: Record<string, typeof BaseTask> | undefined;

function load(): Record<string, typeof BaseTask> {
  if (cache) {
    return cache;
  }
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
  cache = tasks;
  return tasks;
}

const tasks = new Proxy({} as Record<string, typeof BaseTask>, {
  get(_target, prop: string) {
    return load()[prop];
  },
  has(_target, prop: string) {
    return prop in load();
  },
  ownKeys() {
    return Reflect.ownKeys(load());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    return Reflect.getOwnPropertyDescriptor(load(), prop);
  },
});

export default tasks;
