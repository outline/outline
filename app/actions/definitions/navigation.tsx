import {
  HomeIcon,
  SearchIcon,
  ArchiveIcon,
  TrashIcon,
  OpenIcon,
  SettingsIcon,
  KeyboardIcon,
  EmailIcon,
  LogoutIcon,
  ProfileIcon,
  BrowserIcon,
  ShapesIcon,
  DraftsIcon,
  BugIcon,
} from "outline-icons";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { isMac } from "@shared/utils/browser";
import stores from "~/stores";
import type SearchQuery from "~/models/SearchQuery";
import KeyboardShortcuts from "~/scenes/KeyboardShortcuts";
import {
  createAction,
  createExternalLinkAction,
  createInternalLinkAction,
} from "~/actions";
import { NavigationSection, RecentSearchesSection } from "~/actions/sections";
import Desktop from "~/utils/Desktop";
import isCloudHosted from "~/utils/isCloudHosted";
import {
  homePath,
  searchPath,
  draftsPath,
  archivePath,
  trashPath,
  settingsPath,
} from "~/utils/routeHelpers";

export const navigateToHome = createInternalLinkAction({
  name: ({ t }) => t("Home"),
  analyticsName: "Navigate to home",
  section: NavigationSection,
  shortcut: ["d"],
  icon: <HomeIcon />,
  to: homePath(),
  visible: ({ location }) => location.pathname !== homePath(),
});

export const navigateToRecentSearchQuery = (searchQuery: SearchQuery) =>
  createInternalLinkAction({
    section: RecentSearchesSection,
    name: searchQuery.query,
    analyticsName: "Navigate to recent search query",
    icon: <SearchIcon />,
    to: searchPath({ query: searchQuery.query }),
  });

export const navigateToDrafts = createInternalLinkAction({
  name: ({ t }) => t("Drafts"),
  analyticsName: "Navigate to drafts",
  section: NavigationSection,
  icon: <DraftsIcon />,
  to: draftsPath(),
  visible: ({ location }) => location.pathname !== draftsPath(),
});

export const navigateToSearch = createInternalLinkAction({
  name: ({ t }) => t("Search"),
  analyticsName: "Navigate to search",
  section: NavigationSection,
  icon: <SearchIcon />,
  to: searchPath(),
  visible: ({ location }) => location.pathname !== searchPath(),
});

export const navigateToArchive = createInternalLinkAction({
  name: ({ t }) => t("Archive"),
  analyticsName: "Navigate to archive",
  section: NavigationSection,
  shortcut: ["g", "a"],
  icon: <ArchiveIcon />,
  to: archivePath(),
  visible: ({ location }) => location.pathname !== archivePath(),
});

export const navigateToTrash = createInternalLinkAction({
  name: ({ t }) => t("Trash"),
  analyticsName: "Navigate to trash",
  section: NavigationSection,
  icon: <TrashIcon />,
  to: trashPath(),
  visible: ({ location }) => location.pathname !== trashPath(),
});

export const navigateToSettings = createInternalLinkAction({
  name: ({ t }) => t("Settings"),
  analyticsName: "Navigate to settings",
  section: NavigationSection,
  shortcut: ["g", "s"],
  icon: <SettingsIcon />,
  visible: () => stores.policies.abilities(stores.auth.team?.id || "").update,
  to: settingsPath(),
});

export const navigateToWorkspaceSettings = createInternalLinkAction({
  name: ({ t }) => t("Settings"),
  analyticsName: "Navigate to workspace settings",
  section: NavigationSection,
  icon: <SettingsIcon />,
  visible: () => stores.policies.abilities(stores.auth.team?.id || "").update,
  to: settingsPath("details"),
});

export const navigateToProfileSettings = createInternalLinkAction({
  name: ({ t }) => t("Profile"),
  analyticsName: "Navigate to profile settings",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <ProfileIcon />,
  to: settingsPath(),
});

export const navigateToTemplateSettings = createInternalLinkAction({
  name: ({ t }) => t("Templates"),
  analyticsName: "Navigate to template settings",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <ShapesIcon />,
  to: settingsPath("templates"),
});

export const navigateToNotificationSettings = createInternalLinkAction({
  name: ({ t, isMenu }) =>
    isMenu ? t("Notification settings") : t("Notifications"),
  analyticsName: "Navigate to notification settings",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <EmailIcon />,
  to: settingsPath("notifications"),
});

export const navigateToAccountPreferences = createInternalLinkAction({
  name: ({ t }) => t("Preferences"),
  analyticsName: "Navigate to account preferences",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <SettingsIcon />,
  to: settingsPath("preferences"),
});

export const openDocumentation = createExternalLinkAction({
  name: ({ t }) => t("Documentation"),
  analyticsName: "Open documentation",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <OpenIcon />,
  url: UrlHelper.guide,
  target: "_blank",
});

export const openAPIDocumentation = createExternalLinkAction({
  name: ({ t }) => t("API documentation"),
  analyticsName: "Open API documentation",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <OpenIcon />,
  url: UrlHelper.developers,
  target: "_blank",
});

export const toggleSidebar = createAction({
  name: ({ t }) => t("Toggle sidebar"),
  analyticsName: "Toggle sidebar",
  keywords: "hide show navigation",
  section: NavigationSection,
  perform: () => stores.ui.toggleCollapsedSidebar(),
});

export const openFeedbackUrl = createExternalLinkAction({
  name: ({ t }) => t("Send us feedback"),
  analyticsName: "Open feedback",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <EmailIcon />,
  url: UrlHelper.contact,
  target: "_blank",
});

export const openBugReportUrl = createExternalLinkAction({
  name: ({ t }) => t("Report a bug"),
  analyticsName: "Open bug report",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <BugIcon />,
  url: UrlHelper.github,
  target: "_blank",
});

export const openChangelog = createExternalLinkAction({
  name: ({ t }) => t("Changelog"),
  analyticsName: "Open changelog",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <OpenIcon />,
  url: UrlHelper.changelog,
  target: "_blank",
});

export const openKeyboardShortcuts = createAction({
  name: ({ t }) => t("Keyboard shortcuts"),
  analyticsName: "Open keyboard shortcuts",
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

export const downloadApp = createExternalLinkAction({
  name: ({ t }) =>
    t("Download {{ platform }} app", {
      platform: isMac ? "macOS" : "Windows",
    }),
  analyticsName: "Download app",
  section: NavigationSection,
  iconInContextMenu: false,
  icon: <BrowserIcon />,
  visible: () => !Desktop.isElectron() && isMac && isCloudHosted,
  url: "https://desktop.getoutline.com",
  target: "_blank",
});

export const logout = createAction({
  name: ({ t }) => t("Log out"),
  analyticsName: "Log out",
  section: NavigationSection,
  icon: <LogoutIcon />,
  perform: async () => {
    await stores.auth.logout({ userInitiated: true });
  },
});

export const rootNavigationActions = [
  navigateToHome,
  navigateToDrafts,
  navigateToArchive,
  navigateToTrash,
  downloadApp,
  openDocumentation,
  openAPIDocumentation,
  openFeedbackUrl,
  openBugReportUrl,
  openChangelog,
  openKeyboardShortcuts,
  toggleSidebar,
  logout,
];
