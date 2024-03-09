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

PluginManager.getEnabledPlugins(PluginType.EmailTemplate).forEach((plugin) => {
  emails[plugin.id] = plugin.value;
});

export default emails;
