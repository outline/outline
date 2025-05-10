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
        "Measure adoption and engagement by streaming document view data into your existing GA4 property, see which guides drive the most value in your familiar analytics dashboard.",
      component: createLazyComponent(() => import("./Settings")),
    },
  },
]);
