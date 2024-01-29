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
  ShapesIcon,
  Icon,
} from "outline-icons";
import React, { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import GoogleIcon from "~/components/Icons/GoogleIcon";
import ZapierIcon from "~/components/Icons/ZapierIcon";
import PluginLoader from "~/utils/PluginLoader";
import isCloudHosted from "~/utils/isCloudHosted";
import lazy from "~/utils/lazyWithRetry";
import { settingsPath } from "~/utils/routeHelpers";
import useCurrentTeam from "./useCurrentTeam";
import usePolicy from "./usePolicy";

const ApiKeys = lazy(() => import("~/scenes/Settings/ApiKeys"));
const Details = lazy(() => import("~/scenes/Settings/Details"));
const Export = lazy(() => import("~/scenes/Settings/Export"));
const Features = lazy(() => import("~/scenes/Settings/Features"));
const GoogleAnalytics = lazy(() => import("~/scenes/Settings/GoogleAnalytics"));
const Groups = lazy(() => import("~/scenes/Settings/Groups"));
const Import = lazy(() => import("~/scenes/Settings/Import"));
const Members = lazy(() => import("~/scenes/Settings/Members"));
const Notifications = lazy(() => import("~/scenes/Settings/Notifications"));
const Preferences = lazy(() => import("~/scenes/Settings/Preferences"));
const Profile = lazy(() => import("~/scenes/Settings/Profile"));
const Security = lazy(() => import("~/scenes/Settings/Security"));
const SelfHosted = lazy(() => import("~/scenes/Settings/SelfHosted"));
const Shares = lazy(() => import("~/scenes/Settings/Shares"));
const Templates = lazy(() => import("~/scenes/Settings/Templates"));
const Zapier = lazy(() => import("~/scenes/Settings/Zapier"));

export type ConfigItem = {
  name: string;
  path: string;
  icon: React.FC<ComponentProps<typeof Icon>>;
  component: React.ComponentType;
  enabled: boolean;
  group: string;
};

const useSettingsConfig = () => {
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const { t } = useTranslation();

  const config = React.useMemo(() => {
    const items: ConfigItem[] = [
      // Account
      {
        name: t("Profile"),
        path: settingsPath(),
        component: Profile,
        enabled: true,
        group: t("Account"),
        icon: ProfileIcon,
      },
      {
        name: t("Preferences"),
        path: settingsPath("preferences"),
        component: Preferences,
        enabled: true,
        group: t("Account"),
        icon: SettingsIcon,
      },
      {
        name: t("Notifications"),
        path: settingsPath("notifications"),
        component: Notifications,
        enabled: true,
        group: t("Account"),
        icon: EmailIcon,
      },
      {
        name: t("API Tokens"),
        path: settingsPath("tokens"),
        component: ApiKeys,
        enabled: can.createApiKey,
        group: t("Account"),
        icon: CodeIcon,
      },
      // Workspace
      {
        name: t("Details"),
        path: settingsPath("details"),
        component: Details,
        enabled: can.update,
        group: t("Workspace"),
        icon: TeamIcon,
      },
      {
        name: t("Security"),
        path: settingsPath("security"),
        component: Security,
        enabled: can.update,
        group: t("Workspace"),
        icon: PadlockIcon,
      },
      {
        name: t("Features"),
        path: settingsPath("features"),
        component: Features,
        enabled: can.update,
        group: t("Workspace"),
        icon: BeakerIcon,
      },
      {
        name: t("Members"),
        path: settingsPath("members"),
        component: Members,
        enabled: true,
        group: t("Workspace"),
        icon: UserIcon,
      },
      {
        name: t("Groups"),
        path: settingsPath("groups"),
        component: Groups,
        enabled: true,
        group: t("Workspace"),
        icon: GroupIcon,
      },
      {
        name: t("Templates"),
        path: settingsPath("templates"),
        component: Templates,
        enabled: true,
        group: t("Workspace"),
        icon: ShapesIcon,
      },
      {
        name: t("Shared Links"),
        path: settingsPath("shares"),
        component: Shares,
        enabled: true,
        group: t("Workspace"),
        icon: LinkIcon,
      },
      {
        name: t("Import"),
        path: settingsPath("import"),
        component: Import,
        enabled: can.createImport,
        group: t("Workspace"),
        icon: ImportIcon,
      },
      {
        name: t("Export"),
        path: settingsPath("export"),
        component: Export,
        enabled: can.createExport,
        group: t("Workspace"),
        icon: ExportIcon,
      },
      // Integrations
      {
        name: t("Self Hosted"),
        path: integrationSettingsPath("self-hosted"),
        component: SelfHosted,
        enabled: can.update && !isCloudHosted,
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
        // TODO: Remove hardcoding of plugin id here
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
