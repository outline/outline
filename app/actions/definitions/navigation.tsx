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
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'stores' or its corresponding t... Remove this comment to see the full error message
import stores from "stores";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions' or its corresponding ... Remove this comment to see the full error message
import { createAction } from "actions";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions/sections' or its corre... Remove this comment to see the full error message
import { NavigationSection } from "actions/sections";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/history' or its correspo... Remove this comment to see the full error message
import history from "utils/history";
import {
  settingsPath,
  homePath,
  searchUrl,
  draftsPath,
  templatesPath,
  archivePath,
  trashPath,
  // @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
} from "utils/routeHelpers";

export const navigateToHome = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Home"),
  section: NavigationSection,
  shortcut: ["d"],
  icon: <HomeIcon />,
  perform: () => history.push(homePath()),
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'location' implicitly has an 'any'... Remove this comment to see the full error message
  visible: ({ location }) => location.pathname !== homePath(),
});

export const navigateToSearch = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Search"),
  section: NavigationSection,
  shortcut: ["/"],
  icon: <SearchIcon />,
  perform: () => history.push(searchUrl()),
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'location' implicitly has an 'any'... Remove this comment to see the full error message
  visible: ({ location }) => location.pathname !== searchUrl(),
});

export const navigateToDrafts = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Drafts"),
  section: NavigationSection,
  icon: <EditIcon />,
  perform: () => history.push(draftsPath()),
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'location' implicitly has an 'any'... Remove this comment to see the full error message
  visible: ({ location }) => location.pathname !== draftsPath(),
});

export const navigateToTemplates = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Templates"),
  section: NavigationSection,
  icon: <ShapesIcon />,
  perform: () => history.push(templatesPath()),
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'location' implicitly has an 'any'... Remove this comment to see the full error message
  visible: ({ location }) => location.pathname !== templatesPath(),
});

export const navigateToArchive = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Archive"),
  section: NavigationSection,
  icon: <ArchiveIcon />,
  perform: () => history.push(archivePath()),
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'location' implicitly has an 'any'... Remove this comment to see the full error message
  visible: ({ location }) => location.pathname !== archivePath(),
});

export const navigateToTrash = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Trash"),
  section: NavigationSection,
  icon: <TrashIcon />,
  perform: () => history.push(trashPath()),
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'location' implicitly has an 'any'... Remove this comment to see the full error message
  visible: ({ location }) => location.pathname !== trashPath(),
});

export const navigateToSettings = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Settings"),
  section: NavigationSection,
  shortcut: ["g", "s"],
  iconInContextMenu: false,
  icon: <SettingsIcon />,
  perform: () => history.push(settingsPath()),
});

export const openAPIDocumentation = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("API documentation"),
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <OpenIcon />,
  perform: () => window.open(developersUrl()),
});

export const openFeedbackUrl = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Send us feedback"),
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <EmailIcon />,
  perform: () => window.open(mailToUrl()),
});

export const openBugReportUrl = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Report a bug"),
  section: NavigationSection,
  perform: () => window.open(githubIssuesUrl()),
});

export const openChangelog = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Changelog"),
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <OpenIcon />,
  perform: () => window.open(changelogUrl()),
});

export const openKeyboardShortcuts = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Keyboard shortcuts"),
  section: NavigationSection,
  shortcut: ["?"],
  iconInContextMenu: false,
  icon: <KeyboardIcon />,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  perform: ({ t }) => {
    stores.dialogs.openGuide({
      title: t("Keyboard shortcuts"),
      content: <KeyboardShortcuts />,
    });
  },
});

export const logout = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Log out"),
  section: NavigationSection,
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
