import { mapValues } from "lodash";
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
  WebhooksIcon,
  SettingsIcon,
  ExportIcon,
  ImportIcon,
} from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
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
import Tokens from "~/scenes/Settings/Tokens";
import Webhooks from "~/scenes/Settings/Webhooks";
import Zapier from "~/scenes/Settings/Zapier";
import GoogleIcon from "~/components/Icons/GoogleIcon";
import ZapierIcon from "~/components/Icons/ZapierIcon";
import isCloudHosted from "~/utils/isCloudHosted";
import { loadPlugins } from "~/utils/plugins";
import { accountPreferencesPath } from "~/utils/routeHelpers";
import useCurrentTeam from "./useCurrentTeam";
import usePolicy from "./usePolicy";

type SettingsGroups = "Account" | "Team" | "Integrations";

export type ConfigItem = {
  name: string;
  path: string;
  icon: React.FC<any>;
  component: () => JSX.Element;
  enabled: boolean;
  group: SettingsGroups;
};

type ConfigType = {
  [key in string]: ConfigItem;
};

const useSettingsConfig = () => {
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const { t } = useTranslation();

  const config: ConfigType = React.useMemo(
    () => ({
      Profile: {
        name: t("Profile"),
        path: "/settings",
        component: Profile,
        enabled: true,
        group: t("Account"),
        icon: ProfileIcon,
      },
      Preferences: {
        name: t("Preferences"),
        path: accountPreferencesPath(),
        component: Preferences,
        enabled: true,
        group: t("Account"),
        icon: SettingsIcon,
      },
      Notifications: {
        name: t("Notifications"),
        path: "/settings/notifications",
        component: Notifications,
        enabled: true,
        group: t("Account"),
        icon: EmailIcon,
      },
      Api: {
        name: t("API Tokens"),
        path: "/settings/tokens",
        component: Tokens,
        enabled: can.createApiKey,
        group: t("Account"),
        icon: CodeIcon,
      },
      // Team group
      Details: {
        name: t("Details"),
        path: "/settings/details",
        component: Details,
        enabled: can.update,
        group: t("Team"),
        icon: TeamIcon,
      },
      Security: {
        name: t("Security"),
        path: "/settings/security",
        component: Security,
        enabled: can.update,
        group: t("Team"),
        icon: PadlockIcon,
      },
      Features: {
        name: t("Features"),
        path: "/settings/features",
        component: Features,
        enabled: can.update,
        group: t("Team"),
        icon: BeakerIcon,
      },
      Members: {
        name: t("Members"),
        path: "/settings/members",
        component: Members,
        enabled: true,
        group: t("Team"),
        icon: UserIcon,
      },
      Groups: {
        name: t("Groups"),
        path: "/settings/groups",
        component: Groups,
        enabled: true,
        group: t("Team"),
        icon: GroupIcon,
      },
      Shares: {
        name: t("Shared Links"),
        path: "/settings/shares",
        component: Shares,
        enabled: true,
        group: t("Team"),
        icon: LinkIcon,
      },
      Import: {
        name: t("Import"),
        path: "/settings/import",
        component: Import,
        enabled: can.createImport,
        group: t("Team"),
        icon: ImportIcon,
      },
      Export: {
        name: t("Export"),
        path: "/settings/export",
        component: Export,
        enabled: can.createExport,
        group: t("Team"),
        icon: ExportIcon,
      },
      // Integrations
      ...mapValues(loadPlugins(), (plugin) => {
        return {
          name: plugin.config.name,
          path: `/settings/integrations/${plugin.id}`,
          group: t("Integrations"),
          component: plugin.settings,
          enabled: can.update,
          icon: plugin.icon,
        } as ConfigItem;
      }),
      Webhooks: {
        name: t("Webhooks"),
        path: "/settings/webhooks",
        component: Webhooks,
        enabled: can.createWebhookSubscription,
        group: t("Integrations"),
        icon: WebhooksIcon,
      },
      SelfHosted: {
        name: t("Self Hosted"),
        path: "/settings/integrations/self-hosted",
        component: SelfHosted,
        enabled: can.update,
        group: t("Integrations"),
        icon: BuildingBlocksIcon,
      },
      GoogleAnalytics: {
        name: t("Google Analytics"),
        path: "/settings/integrations/google-analytics",
        component: GoogleAnalytics,
        enabled: can.update,
        group: t("Integrations"),
        icon: GoogleIcon,
      },
      Zapier: {
        name: "Zapier",
        path: "/settings/integrations/zapier",
        component: Zapier,
        enabled: can.update && isCloudHosted,
        group: t("Integrations"),
        icon: ZapierIcon,
      },
    }),
    [
      t,
      can.createApiKey,
      can.update,
      can.createImport,
      can.createExport,
      can.createWebhookSubscription,
    ]
  );

  const enabledConfigs = React.useMemo(
    () =>
      Object.keys(config).reduce(
        (acc, key: string) =>
          config[key].enabled ? [...acc, config[key]] : acc,
        []
      ),
    [config]
  );

  return enabledConfigs;
};

export default useSettingsConfig;
