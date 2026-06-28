import { BuildingBlocksIcon, HistoryIcon, SearchIcon } from "outline-icons";
import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";

PluginManager.add([
  {
    ...config,
    id: "upsell-audit-log",
    name: "Audit Log",
    type: Hook.Settings,
    value: {
      group: "Workspace",
      after: "Security",
      icon: HistoryIcon,
      description:
        "Track security and activity events across your workspace. Available in the Enterprise edition.",
      component: createLazyComponent(() => import("./AuditLog")),
    },
  },
  {
    ...config,
    id: "upsell-data-attributes",
    name: "Data Attributes",
    type: Hook.Settings,
    value: {
      group: "Workspace",
      after: "Templates",
      icon: BuildingBlocksIcon,
      description:
        "Define custom properties and metadata for documents. Available in the Enterprise edition.",
      component: createLazyComponent(() => import("./DataAttributes")),
    },
  },
  {
    ...config,
    id: "glean",
    name: "Glean",
    type: Hook.Settings,
    value: {
      group: "Integrations",
      icon: SearchIcon,
      description:
        "Index and search your workspace content inside Glean enterprise search. Available in the Enterprise edition.",
      component: createLazyComponent(() => import("./Glean")),
    },
  },
]);
