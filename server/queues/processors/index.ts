import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import { createLazyRegistry } from "@server/utils/lazyRegistry";
import type { Concrete } from "@shared/types";
import type BaseProcessor from "./BaseProcessor";

const AbstractProcessors = ["ImportsProcessor"];

const processors = createLazyRegistry(() => {
  const processors: Record<string, Concrete<typeof BaseProcessor>> = {};
  requireDirectory<{ default: Concrete<typeof BaseProcessor> }>(
    __dirname
  ).forEach(([module, id]) => {
    if (id === "index" || AbstractProcessors.includes(id)) {
      return;
    }
    processors[id] = module.default;
  });
  PluginManager.getHooks(Hook.Processor).forEach((hook) => {
    processors[hook.value.name] = hook.value;
  });
  return processors;
});

export default processors;
