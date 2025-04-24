import * as React from "react";
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
        "Automate downstream workflows with real-time JSON POSTs, subscribe to document events in Outline so external systems can react instantly to creations, updates, or deletions.",
    },
  },
]);
