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

/**
 * RPC methods that may be coalesced into a single `/batch` request. Deliberately
 * curated to simple JSON mutations — no reads, redirects, file responses, or
 * endpoints that set response headers. Shared by the client (which collects
 * these into a batch) and the server (which only dispatches allowlisted methods).
 */
/** The maximum number of sub-requests permitted in a single `/batch` request. */
export const BatchMaxRequests = 25;

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

export const UserPreferenceDefaults: UserPreferences = {
  [UserPreference.RememberLastPath]: true,
  [UserPreference.UseCursorPointer]: true,
  [UserPreference.CodeBlockLineNumers]: true,
  [UserPreference.SortCommentsByOrderInDocument]: true,
  [UserPreference.EnableSmartText]: true,
  [UserPreference.NotificationBadge]: NotificationBadgeType.Count,
};
