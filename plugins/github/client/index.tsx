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
        "Connect your GitHub account to Outline to enable rich, realtime, issue and pull request previews inside documents.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
