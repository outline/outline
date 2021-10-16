// @flow
import {
  SettingsIcon,
  KeyboardIcon,
  CodeIcon,
  BulletedListIcon,
  EmailIcon,
} from "outline-icons";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import {
  settings,
  developers,
  changelog,
  mailToUrl,
  githubIssuesUrl,
} from "shared/utils/routeHelpers";
import stores from "stores";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import { type Action } from "types";
import history from "utils/history";

export const navigateToSettings: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Settings"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["g", "s"],
  iconInContextMenu: false,
  icon: <SettingsIcon />,
  perform: () => history.push(settings()),
};

export const openAPIDocumentation: Action = {
  id: uuidv4(),
  name: ({ t }) => t("API documentation"),
  section: ({ t }) => t("Navigation"),
  iconInContextMenu: false,
  icon: <CodeIcon />,
  perform: () => window.open(developers()),
};

export const openFeedbackUrl: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Send us feedback"),
  section: ({ t }) => t("Navigation"),
  iconInContextMenu: false,
  icon: <EmailIcon />,
  perform: () => window.open(mailToUrl()),
};

export const openBugReportUrl: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Report a bug"),
  section: ({ t }) => t("Navigation"),
  perform: () => window.open(githubIssuesUrl()),
};

export const openChangelog: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Changelog"),
  section: ({ t }) => t("Navigation"),
  iconInContextMenu: false,
  icon: <BulletedListIcon />,
  perform: () => window.open(changelog()),
};

export const openKeyboardShortcuts: Action = {
  id: uuidv4(),
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
};
