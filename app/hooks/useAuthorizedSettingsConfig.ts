import {
  NewDocumentIcon,
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
  DownloadIcon,
  WebhooksIcon,
  SettingsIcon,
} from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import Details from "~/scenes/Settings/Details";
import Drawio from "~/scenes/Settings/Drawio";
import Export from "~/scenes/Settings/Export";
import Features from "~/scenes/Settings/Features";
import Groups from "~/scenes/Settings/Groups";
import Import from "~/scenes/Settings/Import";
import Members from "~/scenes/Settings/Members";
import Notifications from "~/scenes/Settings/Notifications";
import Preferences from "~/scenes/Settings/Preferences";
import Profile from "~/scenes/Settings/Profile";
import Security from "~/scenes/Settings/Security";
import Shares from "~/scenes/Settings/Shares";
import Slack from "~/scenes/Settings/Slack";
import Tokens from "~/scenes/Settings/Tokens";
import Webhooks from "~/scenes/Settings/Webhooks";
import Zapier from "~/scenes/Settings/Zapier";
import SlackIcon from "~/components/SlackIcon";
import ZapierIcon from "~/components/ZapierIcon";
import env from "~/env";
import isCloudHosted from "~/utils/isCloudHosted";
import { accountPreferencesPath } from "~/utils/routeHelpers";
import useCurrentTeam from "./useCurrentTeam";
import usePolicy from "./usePolicy";

type SettingsGroups = "Account" | "Team" | "Integrations";
type SettingsPage =
  | "Profile"
  | "Notifications"
  | "Api"
  | "Details"
  | "Security"
  | "Features"
  | "Members"
  | "Groups"
  | "Shares"
  | "Import"
  | "Export"
  | "Webhooks"
  | "Slack"
  | "Zapier";

export type ConfigItem = {
  name: string;
  path: string;
  icon: React.FC<any>;
  component: () => JSX.Element;
  enabled: boolean;
  group: SettingsGroups;
};

type ConfigType = {
  [key in SettingsPage]: ConfigItem;
};

const useAuthorizedSettingsConfig = () => {
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
        icon: NewDocumentIcon,
      },
      Export: {
        name: t("Export"),
        path: "/settings/export",
        component: Export,
        enabled: can.createExport,
        group: t("Team"),
        icon: DownloadIcon,
      },
      // Integrations
      Webhooks: {
        name: t("Webhooks"),
        path: "/settings/webhooks",
        component: Webhooks,
        enabled: can.createWebhookSubscription,
        group: t("Integrations"),
        icon: WebhooksIcon,
      },
      Drawio: {
        name: t("Draw.io"),
        path: "/settings/integrations/drawio",
        component: Drawio,
        enabled: can.update,
        group: t("Integrations"),
        icon: BuildingBlocksIcon,
      },
      Slack: {
        name: "Slack",
        path: "/settings/integrations/slack",
        component: Slack,
        enabled: can.update && (!!env.SLACK_CLIENT_ID || isCloudHosted),
        group: t("Integrations"),
        icon: SlackIcon,
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
      can.createApiKey,
      can.createWebhookSubscription,
      can.createExport,
      can.createImport,
      can.update,
      t,
    ]
  );

  const enabledConfigs = React.useMemo(
    () =>
      Object.keys(config).reduce(
        (acc, key: SettingsPage) =>
          config[key].enabled ? [...acc, config[key]] : acc,
        []
      ),
    [config]
  );

  return enabledConfigs;
};

export default useAuthorizedSettingsConfig;
