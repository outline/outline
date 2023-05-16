import {
  EmailIcon,
  ProfileIcon,
  PadlockIcon,
  CodeIcon,
  UserIcon,
  GroupIcon,
  LinkIcon,
  TeamIcon,
  BeakerIcon,
  BuildingBlocksIcon,
  SettingsIcon,
  ExportIcon,
  ImportIcon,
} from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import ApiKeys from "~/scenes/Settings/ApiKeys";
import Details from "~/scenes/Settings/Details";
import Export from "~/scenes/Settings/Export";
import Features from "~/scenes/Settings/Features";
import GoogleAnalytics from "~/scenes/Settings/GoogleAnalytics";
import Groups from "~/scenes/Settings/Groups";
import Import from "~/scenes/Settings/Import";
import Members from "~/scenes/Settings/Members";
import Notifications from "~/scenes/Settings/Notifications";
import Preferences from "~/scenes/Settings/Preferences";
import Profile from "~/scenes/Settings/Profile";
import Security from "~/scenes/Settings/Security";
import SelfHosted from "~/scenes/Settings/SelfHosted";
import Shares from "~/scenes/Settings/Shares";
import Zapier from "~/scenes/Settings/Zapier";
import GoogleIcon from "~/components/Icons/GoogleIcon";
import ZapierIcon from "~/components/Icons/ZapierIcon";
import PluginLoader from "~/utils/PluginLoader";
import isCloudHosted from "~/utils/isCloudHosted";
import { accountPreferencesPath } from "~/utils/routeHelpers";
import useCurrentTeam from "./useCurrentTeam";
import usePolicy from "./usePolicy";

export type ConfigItem = {
  name: string;
  path: string;
  icon: React.FC<any>;
  component: React.ComponentType<any>;
  enabled: boolean;
  group: string;
};

const useSettingsConfig = () => {
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const { t } = useTranslation();

  const config = React.useMemo(() => {
    const items: ConfigItem[] = [
      {
        name: t("Profile"),
        path: "/settings",
        component: Profile,
        enabled: true,
        group: t("Account"),
        icon: ProfileIcon,
      },
      {
        name: t("Preferences"),
        path: accountPreferencesPath(),
        component: Preferences,
        enabled: true,
        group: t("Account"),
        icon: SettingsIcon,
      },
      {
        name: t("Notifications"),
        path: "/settings/notifications",
        component: Notifications,
        enabled: true,
        group: t("Account"),
        icon: EmailIcon,
      },
      {
        name: t("API Tokens"),
        path: "/settings/tokens",
        component: ApiKeys,
        enabled: can.createApiKey,
        group: t("Account"),
        icon: CodeIcon,
      },
      // Team group
      {
        name: t("Details"),
        path: "/settings/details",
        component: Details,
        enabled: can.update,
        group: t("Workspace"),
        icon: TeamIcon,
      },
      {
        name: t("Security"),
        path: "/settings/security",
        component: Security,
        enabled: can.update,
        group: t("Workspace"),
        icon: PadlockIcon,
      },
      {
        name: t("Features"),
        path: "/settings/features",
        component: Features,
        enabled: can.update,
        group: t("Workspace"),
        icon: BeakerIcon,
      },
      {
        name: t("Members"),
        path: "/settings/members",
        component: Members,
        enabled: true,
        group: t("Workspace"),
        icon: UserIcon,
      },
      {
        name: t("Groups"),
        path: "/settings/groups",
        component: Groups,
        enabled: true,
        group: t("Workspace"),
        icon: GroupIcon,
      },
      {
        name: t("Shared Links"),
        path: "/settings/shares",
        component: Shares,
        enabled: true,
        group: t("Workspace"),
        icon: LinkIcon,
      },
      {
        name: t("Import"),
        path: "/settings/import",
        component: Import,
        enabled: can.createImport,
        group: t("Workspace"),
        icon: ImportIcon,
      },
      {
        name: t("Export"),
        path: "/settings/export",
        component: Export,
        enabled: can.createExport,
        group: t("Workspace"),
        icon: ExportIcon,
      },
      {
        name: t("Self Hosted"),
        path: integrationSettingsPath("self-hosted"),
        component: SelfHosted,
        enabled: can.update,
        group: t("Integrations"),
        icon: BuildingBlocksIcon,
      },
      {
        name: t("Google Analytics"),
        path: integrationSettingsPath("google-analytics"),
        component: GoogleAnalytics,
        enabled: can.update,
        group: t("Integrations"),
        icon: GoogleIcon,
      },
      {
        name: "Zapier",
        path: integrationSettingsPath("zapier"),
        component: Zapier,
        enabled: can.update && isCloudHosted,
        group: t("Integrations"),
        icon: ZapierIcon,
      },
    ];

    // Plugins
    Object.values(PluginLoader.plugins).map((plugin) => {
      const hasSettings = !!plugin.settings;
      const enabledInDeployment =
        !plugin.config.deployments ||
        plugin.config.deployments.length === 0 ||
        (plugin.config.deployments.includes("cloud") && isCloudHosted) ||
        (plugin.config.deployments.includes("enterprise") && !isCloudHosted);

      const item = {
        name: t(plugin.config.name),
        path: integrationSettingsPath(plugin.id),
        group: plugin.id === "collections" ? t("Workspace") : t("Integrations"),
        component: plugin.settings,
        enabled: enabledInDeployment && hasSettings && can.update,
        icon: plugin.icon,
      } as ConfigItem;

      const insertIndex = items.findIndex((i) => i.group === t("Integrations"));
      items.splice(insertIndex, 0, item);
    });

    return items;
  }, [t, can.createApiKey, can.update, can.createImport, can.createExport]);

  return config.filter((item) => item.enabled);
};

export default useSettingsConfig;
