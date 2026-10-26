import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import Icon from "./components/Icon";

PluginManager.add([
  {
    ...config,
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: Icon,
      description:
        "Connect your GitLab account to Outline to enable rich, real-time issue, merge request, and project previews inside documents.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
