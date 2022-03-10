import React from "react";
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
import env from "~/env";
import useCurrentTeam from "./useCurrentTeam";
import usePolicy from "./usePolicy";

const isHosted = env.DEPLOYMENT === "hosted";
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

type ConfigType = {
  [key in SettingsPage]: {
    path: string;
    component: () => JSX.Element;
    enabled: boolean;
    group: SettingsGroups;
  };
};

const useAuthorizedSettingsConfig = () => {
  const team = useCurrentTeam();
  const can = usePolicy(team.id);

  const config: ConfigType = React.useMemo(
    () => ({
      Profile: {
        path: "/settings",
        component: Profile,
        enabled: true,
        group: "Account",
      },
      Notifications: {
        path: "/settings/notifications",
        component: Notifications,
        enabled: true,
        group: "Account",
      },
      Api: {
        path: "/settings/tokens",
        component: Tokens,
        enabled: can.createApiKey,
        group: "Account",
      },
      // Team group
      Details: {
        path: "/settings/details",
        component: Details,
        enabled: can.update,
        group: "Team",
      },
      Security: {
        path: "/settings/security",
        component: Security,
        enabled: can.update,
        group: "Team",
      },
      Features: {
        path: "/settings/features",
        component: Features,
        enabled: can.update,
        group: "Team",
      },
      Members: {
        path: "/settings/members",
        component: Members,
        enabled: true,
        group: "Team",
      },
      Groups: {
        path: "/settings/groups",
        component: Groups,
        enabled: true,
        group: "Team",
      },
      Shares: {
        path: "/settings/shares",
        component: Shares,
        enabled: true,
        group: "Team",
      },
      Import: {
        path: "/settings/import",
        component: Import,
        enabled: can.manage,
        group: "Team",
      },
      Export: {
        path: "/settings/export",
        component: Export,
        enabled: can.export,
        group: "Team",
      },
      // Intergrations
      Slack: {
        path: "/settings/integrations/slack",
        component: Slack,
        enabled: can.update && (!!env.SLACK_KEY || isHosted),
        group: "Integrations",
      },
      Zapier: {
        path: "/settings/integrations/zapier",
        component: Zapier,
        enabled: can.update && isHosted,
        group: "Integrations",
      },
    }),
    [can.createApiKey, can.export, can.manage, can.update]
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
