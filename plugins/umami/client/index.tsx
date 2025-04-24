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
        "Gain privacy-first insights into how your team consumes docs, inject your self-hosted Umami script across Outline pages to track views and engagement while retaining full control of your data.",
      enabled: (_, user) => user.role === UserRole.Admin,
    },
  },
]);
