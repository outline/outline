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
  "#00D084",
  "#FF4DFA",
  "#2F362F",
];

/** Identifiers of the built-in color palettes. */
export enum ColorPaletteId {
  Default = "default",
  Peach = "peach",
  Ocean = "ocean",
  Forest = "forest",
  Pastel = "pastel",
  Berry = "berry",
}

/** A named set of preset icon colors. */
export interface ColorPalettePreset {
  /** The stable identifier of the palette. */
  id: ColorPaletteId;
  /** The display name of the palette, passed through translation. */
  name: string;
  /** The hex colors in the palette, one per swatch. */
  colors: string[];
}

/**
 * The built-in color palettes a workspace can choose from.
 *
 * t("Default") t("Desert") t("Ocean") t("Forest") t("Pastel") t("Berry")
 */
export const colorPalettes: ColorPalettePreset[] = [
  {
    id: ColorPaletteId.Default,
    name: "Default",
    colors: colorPalette,
  },
  {
    id: ColorPaletteId.Peach,
    name: "Peach",
    colors: [
      "#fec5bb",
      "#fcd5ce",
      "#fae1dd",
      "#f8edeb",
      "#e8e8e4",
      "#d8e2dc",
      "#ece4db",
      "#ffe5d9",
      "#ffd7ba",
      "#fec89a",
    ],
  },
  {
    id: ColorPaletteId.Ocean,
    name: "Ocean",
    colors: [
      "#001219",
      "#005f73",
      "#0a9396",
      "#94d2bd",
      "#e9d8a6",
      "#ee9b00",
      "#ca6702",
      "#bb3e03",
      "#ae2012",
      "#9b2226",
    ],
  },
  {
    id: ColorPaletteId.Forest,
    name: "Forest",
    colors: [
      "#582f0e",
      "#7f4f24",
      "#936639",
      "#a68a64",
      "#b6ad90",
      "#c2c5aa",
      "#a4ac86",
      "#656d4a",
      "#414833",
      "#333d29",
    ],
  },
  {
    id: ColorPaletteId.Pastel,
    name: "Pastel",
    colors: [
      "#e2e2df",
      "#d2d2cf",
      "#e2cfc4",
      "#f7d9c4",
      "#faedcb",
      "#c9e4de",
      "#c6def1",
      "#dbcdf0",
      "#f2c6de",
      "#f9c6c9",
    ],
  },
  {
    id: ColorPaletteId.Berry,
    name: "Berry",
    colors: [
      "#033270",
      "#1368aa",
      "#4091c9",
      "#9dcee2",
      "#fedfd4",
      "#f29479",
      "#f26a4f",
      "#ef3c2d",
      "#cb1b16",
      "#65010c",
    ],
  },
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
  [TeamPreference.ColorPalette]: colorPalette,
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
