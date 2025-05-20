import {
  EmailIcon,
  ProfileIcon,
  PadlockIcon,
  CodeIcon,
  UserIcon,
  GroupIcon,
  GlobeIcon,
  TeamIcon,
  BeakerIcon,
  SettingsIcon,
  ExportIcon,
  ImportIcon,
  ShapesIcon,
  Icon,
  PlusIcon,
  InternetIcon,
} from "outline-icons";
import { ComponentProps } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";
import { Integrations } from "~/scenes/Settings/Integrations";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import { Hook, PluginManager } from "~/utils/PluginManager";
import { settingsPath } from "~/utils/routeHelpers";
import { useComputed } from "./useComputed";
import useCurrentTeam from "./useCurrentTeam";
import useCurrentUser from "./useCurrentUser";
import usePolicy from "./usePolicy";
import useStores from "./useStores";

const ApiKeys = lazy(() => import("~/scenes/Settings/ApiKeys"));
const Applications = lazy(() => import("~/scenes/Settings/Applications"));
const APIAndApps = lazy(() => import("~/scenes/Settings/APIAndApps"));
const Details = lazy(() => import("~/scenes/Settings/Details"));
const Export = lazy(() => import("~/scenes/Settings/Export"));
const Features = lazy(() => import("~/scenes/Settings/Features"));
const Groups = lazy(() => import("~/scenes/Settings/Groups"));
const Import = lazy(() => import("~/scenes/Settings/Import"));
const Members = lazy(() => import("~/scenes/Settings/Members"));
const Notifications = lazy(() => import("~/scenes/Settings/Notifications"));
const Preferences = lazy(() => import("~/scenes/Settings/Preferences"));
const Profile = lazy(() => import("~/scenes/Settings/Profile"));
const Security = lazy(() => import("~/scenes/Settings/Security"));
const Shares = lazy(() => import("~/scenes/Settings/Shares"));
const Templates = lazy(() => import("~/scenes/Settings/Templates"));

export type ConfigItem = {
  name: string;
  path: string;
  icon: React.FC<ComponentProps<typeof Icon>>;
  component: React.ComponentType;
  description?: string;
  preload?: () => void;
  enabled: boolean;
  group: string;
  pluginId?: string;
};

const useSettingsConfig = () => {
  const { integrations } = useStores();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const { t } = useTranslation();

  React.useEffect(() => {
    void integrations.fetchAll();
  }, [integrations]);

  const config = useComputed(() => {
    const items: ConfigItem[] = [
      // Account
      {
        name: t("Profile"),
        path: settingsPath(),
        component: Profile.Component,
        preload: Profile.preload,
        enabled: true,
        group: t("Account"),
        icon: ProfileIcon,
      },
      {
        name: t("Preferences"),
        path: settingsPath("preferences"),
        component: Preferences.Component,
        preload: Preferences.preload,
        enabled: true,
        group: t("Account"),
        icon: SettingsIcon,
      },
      {
        name: t("Notifications"),
        path: settingsPath("notifications"),
        component: Notifications.Component,
        preload: Notifications.preload,
        enabled: true,
        group: t("Account"),
        icon: EmailIcon,
      },
      {
        name: t("API & Apps"),
        path: settingsPath("api-and-apps"),
        component: APIAndApps.Component,
        preload: APIAndApps.preload,
        enabled: true,
        group: t("Account"),
        icon: PadlockIcon,
      },
      // Workspace
      {
        name: t("Details"),
        path: settingsPath("details"),
        component: Details.Component,
        preload: Details.preload,
        enabled: can.update,
        group: t("Workspace"),
        icon: TeamIcon,
      },
      {
        name: t("Security"),
        path: settingsPath("security"),
        component: Security.Component,
        preload: Security.preload,
        enabled: can.update,
        group: t("Workspace"),
        icon: PadlockIcon,
      },
      {
        name: t("Features"),
        path: settingsPath("features"),
        component: Features.Component,
        preload: Features.preload,
        enabled: can.update,
        group: t("Workspace"),
        icon: BeakerIcon,
      },
      {
        name: t("Members"),
        path: settingsPath("members"),
        component: Members.Component,
        preload: Members.preload,
        enabled: can.listUsers,
        group: t("Workspace"),
        icon: UserIcon,
      },
      {
        name: t("Groups"),
        path: settingsPath("groups"),
        component: Groups.Component,
        preload: Groups.preload,
        enabled: can.listGroups,
        group: t("Workspace"),
        icon: GroupIcon,
      },
      {
        name: t("Templates"),
        path: settingsPath("templates"),
        component: Templates.Component,
        preload: Templates.preload,
        enabled: can.readTemplate,
        group: t("Workspace"),
        icon: ShapesIcon,
      },
      {
        name: t("API Keys"),
        path: settingsPath("api-keys"),
        component: ApiKeys.Component,
        preload: ApiKeys.preload,
        enabled: can.listApiKeys,
        group: t("Workspace"),
        icon: CodeIcon,
      },
      {
        name: t("Applications"),
        path: settingsPath("applications"),
        component: Applications.Component,
        preload: Applications.preload,
        enabled: can.listOAuthClients,
        group: t("Workspace"),
        icon: InternetIcon,
      },
      {
        name: t("Shared Links"),
        path: settingsPath("shares"),
        component: Shares.Component,
        preload: Shares.preload,
        enabled: can.listShares,
        group: t("Workspace"),
        icon: GlobeIcon,
      },
      {
        name: t("Import"),
        path: settingsPath("import"),
        component: Import.Component,
        preload: Import.preload,
        enabled: can.createImport,
        group: t("Workspace"),
        icon: ImportIcon,
      },
      {
        name: t("Export"),
        path: settingsPath("export"),
        component: Export.Component,
        preload: Export.preload,
        enabled: can.createExport,
        group: t("Workspace"),
        icon: ExportIcon,
      },
      // Integrations
      {
        name: `${t("Install")}…`,
        path: settingsPath("integrations"),
        component: Integrations,
        enabled: true,
        group: t("Integrations"),
        icon: PlusIcon,
      },
    ];

    // Plugins
    PluginManager.getHooks(Hook.Settings).forEach((plugin) => {
      const group = plugin.value.group ?? "Integrations";
      const insertIndex = plugin.value.after
        ? items.findIndex((i) => i.name === t(plugin.value.after!)) + 1
        : items.findIndex((i) => i.group === t(group));
      items.splice(insertIndex, 0, {
        name: t(plugin.name),
        path:
          group === "Integrations"
            ? integrationSettingsPath(plugin.id)
            : settingsPath(plugin.id),
        group: t(group),
        pluginId: plugin.id,
        description: plugin.value.description,
        component: plugin.value.component.Component,
        preload: plugin.value.component.preload,
        enabled: plugin.value.enabled
          ? plugin.value.enabled(team, user)
          : can.update,
        icon: plugin.value.icon,
      } as ConfigItem);
    });

    return items;
  }, [t, can.createApiKey, can.update, can.createImport, can.createExport]);

  return config.filter((item) => item.enabled);
};

export default useSettingsConfig;
