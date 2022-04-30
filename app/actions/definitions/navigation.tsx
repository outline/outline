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
  LogoutIcon,
  ProfileIcon,
} from "outline-icons";
import * as React from "react";
import {
  developersUrl,
  changelogUrl,
  feedbackUrl,
  githubIssuesUrl,
} from "@shared/utils/urlHelpers";
import stores from "~/stores";
import SearchQuery from "~/models/SearchQuery";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import { createAction } from "~/actions";
import { NavigationSection, RecentSearchesSection } from "~/actions/sections";
import history from "~/utils/history";
import {
  organizationSettingsPath,
  profileSettingsPath,
  homePath,
  searchPath,
  draftsPath,
  templatesPath,
  archivePath,
  trashPath,
} from "~/utils/routeHelpers";

export const navigateToHome = createAction({
  name: ({ t }) => t("Home"),
  section: NavigationSection,
  shortcut: ["d"],
  icon: <HomeIcon />,
  perform: () => history.push(homePath()),
  visible: ({ location }) => location.pathname !== homePath(),
});

export const navigateToRecentSearchQuery = (searchQuery: SearchQuery) =>
  createAction({
    section: RecentSearchesSection,
    name: searchQuery.query,
    icon: <SearchIcon />,
    perform: () => history.push(searchPath(searchQuery.query)),
  });

export const navigateToDrafts = createAction({
  name: ({ t }) => t("Drafts"),
  section: NavigationSection,
  icon: <EditIcon />,
  perform: () => history.push(draftsPath()),
  visible: ({ location }) => location.pathname !== draftsPath(),
});

export const navigateToTemplates = createAction({
  name: ({ t }) => t("Templates"),
  section: NavigationSection,
  icon: <ShapesIcon />,
  perform: () => history.push(templatesPath()),
  visible: ({ location }) => location.pathname !== templatesPath(),
});

export const navigateToArchive = createAction({
  name: ({ t }) => t("Archive"),
  section: NavigationSection,
  shortcut: ["g", "a"],
  icon: <ArchiveIcon />,
  perform: () => history.push(archivePath()),
  visible: ({ location }) => location.pathname !== archivePath(),
});

export const navigateToTrash = createAction({
  name: ({ t }) => t("Trash"),
  section: NavigationSection,
  icon: <TrashIcon />,
  perform: () => history.push(trashPath()),
  visible: ({ location }) => location.pathname !== trashPath(),
});

export const navigateToSettings = createAction({
  name: ({ t }) => t("Settings"),
  section: NavigationSection,
  shortcut: ["g", "s"],
  icon: <SettingsIcon />,
  visible: ({ stores }) =>
    stores.policies.abilities(stores.auth.team?.id || "").update,
  perform: () => history.push(organizationSettingsPath()),
});

export const navigateToProfileSettings = createAction({
  name: ({ t }) => t("Profile"),
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <ProfileIcon />,
  perform: () => history.push(profileSettingsPath()),
});

export const openAPIDocumentation = createAction({
  name: ({ t }) => t("API documentation"),
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <OpenIcon />,
  perform: () => window.open(developersUrl()),
});

export const openFeedbackUrl = createAction({
  name: ({ t }) => t("Send us feedback"),
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <EmailIcon />,
  perform: () => window.open(feedbackUrl()),
});

export const openBugReportUrl = createAction({
  name: ({ t }) => t("Report a bug"),
  section: NavigationSection,
  perform: () => window.open(githubIssuesUrl()),
});

export const openChangelog = createAction({
  name: ({ t }) => t("Changelog"),
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <OpenIcon />,
  perform: () => window.open(changelogUrl()),
});

export const openKeyboardShortcuts = createAction({
  name: ({ t }) => t("Keyboard shortcuts"),
  section: NavigationSection,
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
  section: NavigationSection,
  icon: <LogoutIcon />,
  perform: () => stores.auth.logout(),
});

export const rootNavigationActions = [
  navigateToHome,
  navigateToDrafts,
  navigateToTemplates,
  navigateToArchive,
  navigateToTrash,
  openAPIDocumentation,
  openFeedbackUrl,
  openBugReportUrl,
  openChangelog,
  openKeyboardShortcuts,
  logout,
];
