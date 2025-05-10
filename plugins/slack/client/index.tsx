import { UserRole } from "@shared/types";
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
        "Surface and search your knowledge base directly in Slack, get /outline search, rich link previews, and automatic notifications on new or updated docs to keep conversations informed without switching apps.",
      component: createLazyComponent(() => import("./Settings")),
      enabled: (_, user) =>
        [UserRole.Member, UserRole.Admin].includes(user.role),
    },
  },
  {
    ...config,
    type: Hook.Icon,
    value: Icon,
  },
]);
