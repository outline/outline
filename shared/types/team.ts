/** Custom brand colors for a workspace. */
export type CustomTheme = {
  accent: string;
  accentText: string;
};

/** The workspace details that are visible on public shares. */
export type PublicTeam = {
  avatarUrl: string;
  name: string;
  customTheme: Partial<CustomTheme>;
  tocPosition: TOCPosition;
};

/** Positions of the table of contents relative to the document. */
export enum TOCPosition {
  Left = "left",
  Right = "right",
}

/** Who can see user email addresses. */
export enum EmailDisplay {
  None = "none",
  Members = "members",
  Everyone = "everyone",
}

/** Who can comment on documents. */
export enum CommentingAccess {
  /** No one can comment. */
  None = "none",
  /** Only members can comment. */
  Members = "members",
  /** Members and guests can comment. */
  Everyone = "everyone",
}

/** Workspace-level preferences. */
export enum TeamPreference {
  /** Whether documents have a separate edit mode instead of always editing. */
  SeamlessEdit = "seamlessEdit",
  /** Whether to use team logo across the app for branding. */
  PublicBranding = "publicBranding",
  /** Whether viewers should see download options. */
  ViewersCanExport = "viewersCanExport",
  /** Whether members can invite new users. */
  MembersCanInvite = "membersCanInvite",
  /** Whether members can create API keys. */
  MembersCanCreateApiKey = "membersCanCreateApiKey",
  /** Whether members can delete their user account. */
  MembersCanDeleteAccount = "membersCanDeleteAccount",
  /** Whether notification emails include document and comment content. */
  PreviewsInEmails = "previewsInEmails",
  /** Who can comment on documents. */
  Commenting = "commenting",
  /** The custom theme for the team. */
  CustomTheme = "customTheme",
  /** Side to display the document's table of contents in relation to the main content. */
  TocPosition = "tocPosition",
  /** Whether to prevent shared documents from being embedded in iframes on external websites. */
  PreventDocumentEmbedding = "preventDocumentEmbedding",
  /** Who can see user email addresses. */
  EmailDisplay = "emailDisplay",
  /** Whether external MCP clients can connect to the workspace. */
  MCP = "mcp",
  /** List of disabled embed provider titles. */
  DisabledEmbeds = "disabledEmbeds",
}

/** Workspace preference values, keyed by preference. */
export type TeamPreferences = {
  [TeamPreference.SeamlessEdit]?: boolean;
  [TeamPreference.PublicBranding]?: boolean;
  [TeamPreference.ViewersCanExport]?: boolean;
  [TeamPreference.MembersCanInvite]?: boolean;
  [TeamPreference.MembersCanCreateApiKey]?: boolean;
  [TeamPreference.MembersCanDeleteAccount]?: boolean;
  [TeamPreference.PreviewsInEmails]?: boolean;
  [TeamPreference.Commenting]?: CommentingAccess;
  [TeamPreference.CustomTheme]?: Partial<CustomTheme>;
  [TeamPreference.TocPosition]?: TOCPosition;
  [TeamPreference.PreventDocumentEmbedding]?: boolean;
  [TeamPreference.EmailDisplay]?: EmailDisplay;
  [TeamPreference.MCP]?: boolean;
  [TeamPreference.DisabledEmbeds]?: string[];
};
