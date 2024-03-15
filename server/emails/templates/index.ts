import { PluginManager, PluginType } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import BaseEmail from "./BaseEmail";

const emails = {};

requireDirectory<{ default: BaseEmail<any> }>(__dirname).forEach(
  ([module, id]) => {
    if (id === "index") {
      return;
    }

    emails[id] = module.default;
  }
);

PluginManager.getPlugins(PluginType.EmailTemplate).forEach((plugin) => {
  emails[plugin.value.name] = plugin.value;
});

export default emails;
