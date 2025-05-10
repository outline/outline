import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import Icon from "./Icon";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description:
        "Measure adoption and engagement by sending view and event analytics directly to your GA4 dashboard.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
