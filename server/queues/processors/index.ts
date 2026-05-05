import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import type BaseProcessor from "./BaseProcessor";

const AbstractProcessors = ["ImportsProcessor"];

let cache: Record<string, typeof BaseProcessor> | undefined;

function load(): Record<string, typeof BaseProcessor> {
  if (cache) {
    return cache;
  }
  const processors: Record<string, typeof BaseProcessor> = {};
  requireDirectory<{ default: typeof BaseProcessor }>(__dirname).forEach(
    ([module, id]) => {
      if (id === "index" || AbstractProcessors.includes(id)) {
        return;
      }
      processors[id] = module.default;
    }
  );
  PluginManager.getHooks(Hook.Processor).forEach((hook) => {
    processors[hook.value.name] = hook.value;
  });
  cache = processors;
  return processors;
}

const processors = new Proxy({} as Record<string, typeof BaseProcessor>, {
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

export default processors;
