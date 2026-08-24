import { TeamIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import { settingsPath } from "~/utils/routeHelpers";
import { hasRequiredRole } from "~/utils/shopAccess";
import { currentRole } from "~/utils/shopScope";
import { useComputed } from "./useComputed";

const Billing = lazy(() => import("~/scenes/Settings/Billing"));
const Receipts = lazy(() => import("~/scenes/Settings/Receipts"));
const Notes = lazy(() => import("~/scenes/Settings/Notes"));
const Audit = lazy(() => import("~/scenes/Settings/Audit"));

/** Describes an entry rendered in the settings navigation. */
export interface ConfigItem {
  name: string;
  path: string;
  icon: React.FC<{
    size?: number;
    fill?: string;
    monochrome?: boolean;
  }>;
  component: React.ComponentType;
  description?: string;
  preload?: () => void;
  enabled: boolean;
  group: string;
  pluginId?: string;
}

const useSettingsConfig = () => {
  const role = currentRole();
  const isManager = Boolean(role && hasRequiredRole(role, "manager"));
  const { t } = useTranslation();
  const config = useComputed(() => {
    const items: ConfigItem[] = [
      {
        name: t("Billing"),
        path: settingsPath("billing"),
        component: Billing.Component,
        preload: Billing.preload,
        enabled: isManager,
        group: t("Workspace"),
        icon: TeamIcon,
      },
      {
        name: t("Receipts"),
        path: settingsPath("receipts"),
        component: Receipts.Component,
        preload: Receipts.preload,
        enabled: isManager,
        group: t("Workspace"),
        icon: TeamIcon,
      },
      {
        name: t("Boarding agreement"),
        path: settingsPath("documents"),
        component: Notes.Component,
        preload: Notes.preload,
        enabled: isManager,
        group: t("Workspace"),
        icon: TeamIcon,
      },
      {
        name: t("Activity"),
        path: settingsPath("activity"),
        component: Audit.Component,
        preload: Audit.preload,
        enabled: isManager,
        group: t("Workspace"),
        icon: TeamIcon,
      },
    ];

    return items;
  }, [isManager, t]);

  return config.filter((item) => item.enabled);
};

export default useSettingsConfig;
