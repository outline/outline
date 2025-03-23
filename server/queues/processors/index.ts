import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import BaseProcessor from "./BaseProcessor";

const processors: Record<string, typeof BaseProcessor> = {};

const AbstractProcessors = ["ImportsProcessor"];

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

export default processors;
