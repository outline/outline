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
        "Track your docs with a self-hosted, open-source analytics platform, link Outline to Matomo for 100% data ownership, GDPR compliance, and deep usage insights on your own servers.",
      enabled: (_, user) => user.role === UserRole.Admin,
    },
  },
]);
