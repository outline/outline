import { Hook, PluginManager } from "@server/utils/PluginManager";
import { requireDirectory } from "@server/utils/fs";
import type BaseEmail from "./BaseEmail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry of heterogeneous template Props subtypes; BaseEmail<EmailProps> isn't assignable from BaseEmail<Subtype>.
let cache: Record<string, typeof BaseEmail<any>> | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function load(): Record<string, typeof BaseEmail<any>> {
  if (cache) {
    return cache;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  cache = emails;
  return emails;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emails = new Proxy({} as Record<string, typeof BaseEmail<any>>, {
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

export default emails;
