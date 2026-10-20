import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import Icon from "./Icon";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Developer",
      after: "Applications",
      icon: Icon,
      description:
        "Automate downstream workflows with real-time JSON POSTs. Subscribe to events in Outline so external systems can react instantly.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
