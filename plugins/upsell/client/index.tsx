import {
  BuildingBlocksIcon,
  CollectionIcon,
  HistoryIcon,
  SearchIcon,
} from "outline-icons";
import { createLazyComponent } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import { PlanFeature } from "@shared/types";
import config from "../plugin.json";

PluginManager.add([
  {
    ...config,
    id: "upsell-audit-log",
    name: "Audit log",
    type: Hook.Settings,
    value: {
      group: "Workspace",
      after: "Security",
      icon: HistoryIcon,
      description: "Track security and activity events across your workspace.",
      component: createLazyComponent(() => import("./AuditLog")),
      upsell: PlanFeature.AuditLog,
    },
  },
  {
    ...config,
    id: "upsell-collections",
    name: "Content",
    type: Hook.Settings,
    value: {
      group: "Workspace",
      after: "Groups",
      icon: CollectionIcon,
      description:
        "Manage permissions and settings for every collection, including private ones.",
      component: createLazyComponent(() => import("./Collections")),
      upsell: PlanFeature.ContentManagement,
    },
  },
  {
    ...config,
    id: "upsell-data-attributes",
    name: "Data attributes",
    type: Hook.Settings,
    value: {
      group: "Workspace",
      after: "Templates",
      icon: BuildingBlocksIcon,
      description: "Define custom properties and metadata for documents.",
      component: createLazyComponent(() => import("./DataAttributes")),
      upsell: PlanFeature.DataAttributes,
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
        "Index and search your workspace content inside Glean enterprise search.",
      component: createLazyComponent(() => import("./Glean")),
      upsell: PlanFeature.PremiumIntegrations,
    },
  },
]);
