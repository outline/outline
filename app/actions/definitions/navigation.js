// @flow
import {
  HomeIcon,
  OpenIcon,
  SettingsIcon,
  KeyboardIcon,
  EmailIcon,
} from "outline-icons";
import * as React from "react";
import {
  settings,
  developers,
  changelog,
  mailToUrl,
  githubIssuesUrl,
} from "shared/utils/routeHelpers";
import stores from "stores";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import { createAction } from "actions";
import history from "utils/history";
import { homeUrl } from "utils/routeHelpers";

export const navigateToHome = createAction({
  name: ({ t }) => t("Home"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["g", "h"],
  icon: <HomeIcon />,
  perform: () => history.push(homeUrl()),
  visible: ({ location }) => location.pathname !== homeUrl(),
});

export const navigateToSettings = createAction({
  name: ({ t }) => t("Settings"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["g", "s"],
  iconInContextMenu: false,
  icon: <SettingsIcon />,
  perform: () => history.push(settings()),
});

export const openAPIDocumentation = createAction({
  name: ({ t }) => t("API documentation"),
  section: ({ t }) => t("Navigation"),
  iconInContextMenu: false,
  icon: <OpenIcon />,
  perform: () => window.open(developers()),
});

export const openFeedbackUrl = createAction({
  name: ({ t }) => t("Send us feedback"),
  section: ({ t }) => t("Navigation"),
  iconInContextMenu: false,
  icon: <EmailIcon />,
  perform: () => window.open(mailToUrl()),
});

export const openBugReportUrl = createAction({
  name: ({ t }) => t("Report a bug"),
  section: ({ t }) => t("Navigation"),
  perform: () => window.open(githubIssuesUrl()),
});

export const openChangelog = createAction({
  name: ({ t }) => t("Changelog"),
  section: ({ t }) => t("Navigation"),
  iconInContextMenu: false,
  icon: <OpenIcon />,
  perform: () => window.open(changelog()),
});

export const openKeyboardShortcuts = createAction({
  name: ({ t }) => t("Keyboard shortcuts"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["?"],
  iconInContextMenu: false,
  icon: <KeyboardIcon />,
  perform: ({ t }) => {
    stores.dialogs.openGuide({
      title: t("Keyboard shortcuts"),
      content: <KeyboardShortcuts />,
    });
  },
});

export const rootNavigationActions = [
  navigateToHome,
  navigateToSettings,
  openAPIDocumentation,
  openFeedbackUrl,
  openBugReportUrl,
  openChangelog,
  openKeyboardShortcuts,
];
