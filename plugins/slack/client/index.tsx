import * as React from "react";
import { UserRole } from "@shared/types";
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
      component: React.lazy(() => import("./Settings")),
      description:
        "Surface and search your knowledge base directly in Slack, get /outline search, rich link previews, and automatic notifications on new or updated docs to keep conversations informed without switching apps.",
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
