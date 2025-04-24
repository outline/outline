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
        "Embed live issue and pull-request previews in your documentation, hover over GitHub links in Outline to see current status, titles, and descriptions without context-switching.",
    },
  },
]);
