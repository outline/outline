import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import { createLazyRegistry } from "@server/utils/lazyRegistry";
import type BaseEmail from "./BaseEmail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry of heterogeneous template Props subtypes; BaseEmail<EmailProps> isn't assignable from BaseEmail<Subtype>.
const emails = createLazyRegistry<typeof BaseEmail<any>>(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registry: Record<string, typeof BaseEmail<any>> = {};
  requireDirectory<{ default: typeof BaseEmail }>(__dirname).forEach(
    ([module, id]) => {
      if (id === "index") {
        return;
      }
      registry[id] = module.default;
    }
  );
  PluginManager.getHooks(Hook.EmailTemplate).forEach((hook) => {
    registry[hook.value.name] = hook.value;
  });
  return registry;
});

export default emails;
