import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import type BaseEmail from "./BaseEmail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry of heterogeneous template Props subtypes; BaseEmail<EmailProps> isn't assignable from BaseEmail<Subtype>.
const emails: Record<string, typeof BaseEmail<any>> = {};

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
