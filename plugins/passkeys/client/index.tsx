import { createLazyComponent } from "~/components/LazyLoad";
import { PluginManager, Hook } from "~/utils/PluginManager";
import { PadlockIcon } from "outline-icons";
import config from "../plugin.json";

PluginManager.add([
  {
    ...config,
    type: Hook.Icon,
    value: PadlockIcon,
  },
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Account",
      icon: PadlockIcon,
      description:
        "Manage your passkeys for passwordless authentication using biometrics or security keys.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
