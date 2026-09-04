import type {
  DocumentPreferences,
  TeamPreferences,
  UserPreferences,
} from "./types";
import {
  TOCPosition,
  DocumentPreference,
  HeadingPrefixStyle,
  TeamPreference,
  UserPreference,
  EmailDisplay,
  CommentingAccess,
  NotificationBadgeType,
} from "./types";

export const MAX_AVATAR_DISPLAY = 6;

/** Height of the app's fixed header in pixels. */
export const HEADER_HEIGHT = 56;

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
  /** Cookie name used on secure origins. */
  secureCookieName: "__Host-csrfToken",
  /** Cookie name used over HTTP, where the `__Host-` prefix is not accepted. */
  cookieName: "csrfToken",
  /** Request header that carries the token for API requests. */
  headerName: "x-csrf-token",
  /** Hidden field that carries the token for native form submissions. */
  fieldName: "_csrf",
};

/** The maximum number of sub-requests permitted in a single `/batch` request. */
export const BatchMaxRequests = 25;

/**
 * RPC methods that may be coalesced into a single `/batch` request. Deliberately
 * curated to simple JSON mutations — no reads, redirects, file responses, or
 * endpoints that set response headers. Shared by the client (which collects
 * these into a batch) and the server (which only dispatches allowlisted methods).
 *
 * When adding a method, also add its router to `dispatchableRouters` in
 * server/routes/api/batch/batch.ts so the server can resolve its middleware.
 */
export const BatchableApiMethods = [
  "documents.update",
  "documents.move",
  "documents.archive",
  "documents.restore",
  "documents.unpublish",
  "documents.delete",
  "collections.update",
  "collections.move",
  "collections.archive",
  "collections.restore",
  "collections.delete",
  "stars.create",
  "stars.delete",
  "pins.create",
  "pins.delete",
] as const;

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

export const DocumentPreferenceDefaults: DocumentPreferences = {
  [DocumentPreference.HeadingPrefix]: HeadingPrefixStyle.None,
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
