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
        "Search your knowledge base directly in Slack with /outline, and get rich link previews and notifications for new or updated docs.",
      component: createLazyComponent(() => import("./Settings")),
      enabled: () => true,
    },
  },
  {
    ...config,
    type: Hook.Icon,
    value: Icon,
  },
]);
