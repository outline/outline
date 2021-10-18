// @flow
import {
  HomeIcon,
  SearchIcon,
  ArchiveIcon,
  TrashIcon,
  EditIcon,
  OpenIcon,
  SettingsIcon,
  ShapesIcon,
  KeyboardIcon,
  EmailIcon,
} from "outline-icons";
import * as React from "react";
import {
  developersUrl,
  changelogUrl,
  mailToUrl,
  githubIssuesUrl,
} from "shared/utils/routeHelpers";
import stores from "stores";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import { createAction } from "actions";
import history from "utils/history";
import {
  settingsPath,
  homePath,
  searchUrl,
  draftsPath,
  templatesPath,
  archivePath,
  trashPath,
} from "utils/routeHelpers";

export const navigateToHome = createAction({
  name: ({ t }) => t("Home"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["d"],
  icon: <HomeIcon />,
  perform: () => history.push(homePath()),
  visible: ({ location }) => location.pathname !== homePath(),
});

export const navigateToSearch = createAction({
  name: ({ t }) => t("Search"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["/"],
  icon: <SearchIcon />,
  perform: () => history.push(searchUrl()),
  visible: ({ location }) => location.pathname !== searchUrl(),
});

export const navigateToDrafts = createAction({
  name: ({ t }) => t("Drafts"),
  section: ({ t }) => t("Navigation"),
  icon: <EditIcon />,
  perform: () => history.push(draftsPath()),
  visible: ({ location }) => location.pathname !== draftsPath(),
});

export const navigateToTemplates = createAction({
  name: ({ t }) => t("Templates"),
  section: ({ t }) => t("Navigation"),
  icon: <ShapesIcon />,
  perform: () => history.push(templatesPath()),
  visible: ({ location }) => location.pathname !== templatesPath(),
});

export const navigateToArchive = createAction({
  name: ({ t }) => t("Archive"),
  section: ({ t }) => t("Navigation"),
  icon: <ArchiveIcon />,
  perform: () => history.push(archivePath()),
  visible: ({ location }) => location.pathname !== archivePath(),
});

export const navigateToTrash = createAction({
  name: ({ t }) => t("Trash"),
  section: ({ t }) => t("Navigation"),
  icon: <TrashIcon />,
  perform: () => history.push(trashPath()),
  visible: ({ location }) => location.pathname !== trashPath(),
});

export const navigateToSettings = createAction({
  name: ({ t }) => t("Settings"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["g", "s"],
  iconInContextMenu: false,
  icon: <SettingsIcon />,
  perform: () => history.push(settingsPath()),
});

export const openAPIDocumentation = createAction({
  name: ({ t }) => t("API documentation"),
  section: ({ t }) => t("Navigation"),
  iconInContextMenu: false,
  icon: <OpenIcon />,
  perform: () => window.open(developersUrl()),
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
  perform: () => window.open(changelogUrl()),
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

export const logout = createAction({
  name: ({ t }) => t("Log out"),
  section: ({ t }) => t("Navigation"),
  perform: () => stores.auth.logout(),
});

export const rootNavigationActions = [
  navigateToHome,
  navigateToSearch,
  navigateToDrafts,
  navigateToTemplates,
  navigateToArchive,
  navigateToTrash,
  navigateToSettings,
  openAPIDocumentation,
  openFeedbackUrl,
  openBugReportUrl,
  openChangelog,
  openKeyboardShortcuts,
  logout,
];
