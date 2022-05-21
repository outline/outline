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
  DownloadIcon,
} from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import Details from "~/scenes/Settings/Details";
import Export from "~/scenes/Settings/Export";
import Features from "~/scenes/Settings/Features";
import Groups from "~/scenes/Settings/Groups";
import Import from "~/scenes/Settings/Import";
import Members from "~/scenes/Settings/Members";
import Notifications from "~/scenes/Settings/Notifications";
import Profile from "~/scenes/Settings/Profile";
import Security from "~/scenes/Settings/Security";
import Shares from "~/scenes/Settings/Shares";
import Slack from "~/scenes/Settings/Slack";
import Tokens from "~/scenes/Settings/Tokens";
import Zapier from "~/scenes/Settings/Zapier";
import SlackIcon from "~/components/SlackIcon";
import ZapierIcon from "~/components/ZapierIcon";
import env from "~/env";
import isCloudHosted from "~/utils/isCloudHosted";
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
  const can = usePolicy(team.id);
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
        name: t("Share Links"),
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
        enabled: can.manage,
        group: t("Team"),
        icon: NewDocumentIcon,
      },
      Export: {
        name: t("Export"),
        path: "/settings/export",
        component: Export,
        enabled: can.export,
        group: t("Team"),
        icon: DownloadIcon,
      },
      // Intergrations
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
    [can.createApiKey, can.export, can.manage, can.update, t]
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
