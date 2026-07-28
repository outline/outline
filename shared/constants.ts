import type { TeamPreferences, UserPreferences } from "./types";
import {
  TOCPosition,
  TeamPreference,
  UserPreference,
  EmailDisplay,
  CommentingAccess,
  NotificationBadgeType,
} from "./types";

export const MAX_AVATAR_DISPLAY = 6;

/** Preset colors offered when choosing an icon color. */
export const colorPalette = [
  "#4E5C6E",
  "#0366D6",
  "#2BC2FF",
  "#9E5CF7",
  "#FF825C",
  "#FF5C80",
  "#FFBE0B",
  "#42DED1",
  "#00D084",
  "#FF4DFA",
  "#2F362F",
];

export const Pagination = {
  defaultLimit: 25,
  defaultOffset: 0,
  maxLimit: 100,
  sidebarLimit: 10,
};

export const CSRF = {
  cookieName: "csrfToken",
  headerName: "x-csrf-token",
  fieldName: "_csrf",
};

export const TeamPreferenceDefaults: TeamPreferences = {
  [TeamPreference.SeamlessEdit]: true,
  [TeamPreference.ViewersCanExport]: true,
  [TeamPreference.MembersCanInvite]: false,
  [TeamPreference.MembersCanCreateApiKey]: true,
  [TeamPreference.MembersCanDeleteAccount]: true,
  [TeamPreference.PreviewsInEmails]: true,
  [TeamPreference.PublicBranding]: false,
  [TeamPreference.Commenting]: CommentingAccess.Members,
  [TeamPreference.CustomTheme]: undefined,
  [TeamPreference.TocPosition]: TOCPosition.Left,
  [TeamPreference.PreventDocumentEmbedding]: false,
  [TeamPreference.EmailDisplay]: EmailDisplay.Members,
  [TeamPreference.MCP]: true,
  [TeamPreference.DisabledEmbeds]: [],
};

export const UserPreferenceDefaults: UserPreferences = {
  [UserPreference.RememberLastPath]: true,
  [UserPreference.UseCursorPointer]: true,
  [UserPreference.CodeBlockLineNumers]: true,
  [UserPreference.CommentsInGutter]: true,
  [UserPreference.SortCommentsByOrderInDocument]: true,
  [UserPreference.EnableSmartText]: true,
  [UserPreference.NotificationBadge]: NotificationBadgeType.Count,
};
