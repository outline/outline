import { PluginManager, PluginType } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import BaseProcessor from "./BaseProcessor";

const processors = {};

requireDirectory<{ default: BaseProcessor }>(__dirname).forEach(
  ([module, id]) => {
    if (id === "index") {
      return;
    }
    processors[id] = module.default;
  }
);

PluginManager.getEnabledPlugins(PluginType.Processor).forEach((plugin) => {
  processors[plugin.id] = plugin.value;
});

export default processors;
