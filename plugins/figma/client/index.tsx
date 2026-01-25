import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import Icon from "./Icon";
import { createLazyComponent } from "~/components/LazyLoad";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description:
        "Connect your Figma account to Outline to enable rich design file previews inside documents.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
