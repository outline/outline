import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import BaseEmail from "./BaseEmail";

const emails: Record<string, typeof BaseEmail> = {};

requireDirectory<{ default: typeof BaseEmail }>(__dirname).forEach(
  ([module, id]) => {
    if (id === "index") {
      return;
    }

    emails[id] = module.default;
  }
);

PluginManager.getHooks(Hook.EmailTemplate).forEach((hook) => {
  emails[hook.value.name] = hook.value;
});

export default emails;
