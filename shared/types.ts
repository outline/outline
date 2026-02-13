/** Available user roles. */
export enum UserRole {
  Admin = "admin",
  Member = "member",
  Viewer = "viewer",
  Guest = "guest",
}

/** Scopes for OAuth and API keys. */
export enum Scope {
  Read = "read",
  Write = "write",
  Create = "create",
}

export type DateFilter = "day" | "week" | "month" | "year";

export enum StatusFilter {
  Published = "published",
  Archived = "archived",
  Draft = "draft",
}

export enum SortFilter {
  CreatedAt = "createdAt",
  UpdatedAt = "updatedAt",
  Title = "title",
}

export enum DirectionFilter {
  ASC = "ASC",
  DESC = "DESC",
}

export enum CollectionStatusFilter {
  Archived = "archived",
}

export enum CommentStatusFilter {
  Resolved = "resolved",
  Unresolved = "unresolved",
}

export enum Client {
  Web = "web",
  Desktop = "desktop",
}

export enum ExportContentType {
  Markdown = "text/markdown",
  Html = "text/html",
  Pdf = "application/pdf",
}

export enum FileOperationFormat {
  JSON = "json",
  MarkdownZip = "outline-markdown",
  HTMLZip = "html",
  PDF = "pdf",
  Notion = "notion",
}

export enum FileOperationType {
  Import = "import",
  Export = "export",
}

export enum FileOperationState {
  Creating = "creating",
  Uploading = "uploading",
  Complete = "complete",
  Error = "error",
  Expired = "expired",
}

export enum ImportState {
  Created = "created",
  InProgress = "in_progress",
  Processed = "processed",
  Completed = "completed",
  Errored = "errored",
  Canceled = "canceled",
}

export enum ImportTaskState {
  Created = "created",
  InProgress = "in_progress",
  Completed = "completed",
  Errored = "errored",
  Canceled = "canceled",
}

export enum MentionType {
  User = "user",
  Document = "document",
  Collection = "collection",
  Group = "group",
  Issue = "issue",
  PullRequest = "pull_request",
  URL = "url",
}

export type PublicEnv = {
  ROOT_SHARE_ID?: string;
  analytics: {
    service: IntegrationService;
    settings: IntegrationSettings<IntegrationType.Analytics>;
  }[];
};

export enum AttachmentPreset {
  DocumentAttachment = "documentAttachment",
  WorkspaceImport = "workspaceImport",
  Import = "import",
  Avatar = "avatar",
  Emoji = "emoji",
}

export enum IntegrationType {
  /** An integration that posts updates to an external system. */
  Post = "post",
  /** An integration that listens for commands from an external system. */
  Command = "command",
  /** An integration that embeds content from an external system. */
  Embed = "embed",
  /** An integration that captures analytics data. */
  Analytics = "analytics",
  /** An integration that maps an Outline user to an external service. */
  LinkedAccount = "linkedAccount",
  /** An integration that imports documents into Outline. */
  Import = "import",
}

export enum IntegrationService {
  Diagrams = "diagrams",
  Grist = "grist",
  Slack = "slack",
  GoogleAnalytics = "google-analytics",
  Matomo = "matomo",
  Umami = "umami",
  GitHub = "github",
  Linear = "linear",
  Figma = "figma",
  Notion = "notion",
}

export type ImportableIntegrationService = Extract<
  IntegrationService,
  IntegrationService.Notion
>;

export const ImportableIntegrationService = {
  Notion: IntegrationService.Notion,
} as const;

export type IssueTrackerIntegrationService = Extract<
  IntegrationService,
  IntegrationService.GitHub | IntegrationService.Linear
>;

export const IssueTrackerIntegrationService = {
  GitHub: IntegrationService.GitHub,
  Linear: IntegrationService.Linear,
} as const;

export type UserCreatableIntegrationService = Extract<
  IntegrationService,
  | IntegrationService.Diagrams
  | IntegrationService.Grist
  | IntegrationService.GoogleAnalytics
  | IntegrationService.Matomo
  | IntegrationService.Umami
>;

export const UserCreatableIntegrationService = {
  Diagrams: IntegrationService.Diagrams,
  Grist: IntegrationService.Grist,
  GoogleAnalytics: IntegrationService.GoogleAnalytics,
  Matomo: IntegrationService.Matomo,
  Umami: IntegrationService.Umami,
} as const;

export enum CollectionPermission {
  Read = "read",
  ReadWrite = "read_write",
  Admin = "admin",
}

export enum DocumentPermission {
  Read = "read",
  ReadWrite = "read_write",
  Admin = "admin",
}

export enum GroupPermission {
  Member = "member",
  Admin = "admin",
}

export type IntegrationSettings<T> = T extends IntegrationType.Embed
  ? {
      url?: string;
      github?: {
        installation: {
          id: number;
          account: { id: number; name: string; avatarUrl: string };
        };
      };
      linear?: {
        workspace: { id: string; name: string; key: string; logoUrl?: string };
      };
      diagrams?: {
        url: string;
      };
    }
  : T extends IntegrationType.Analytics
    ? { measurementId: string; instanceUrl?: string; scriptName?: string }
    : T extends IntegrationType.Post
      ? { url: string; channel: string; channelId: string }
      : T extends IntegrationType.Command
        ? { serviceTeamId: string }
        : T extends IntegrationType.Import
          ? {
              externalWorkspace: { id: string; name: string; iconUrl?: string };
            }
          : T extends IntegrationType.LinkedAccount
            ? {
                slack?: { serviceTeamId: string; serviceUserId: string };
                figma?: {
                  account: {
                    id: string;
                    name: string;
                    email: string;
                    avatarUrl: string;
                  };
                };
              }
            :
                | { url: string }
                | {
                    github?: {
                      installation: {
                        id: number;
                        account: {
                          id?: number;
                          name: string;
                          avatarUrl?: string;
                        };
                      };
                    };
                    diagrams?: {
                      url: string;
                    };
                  }
                | { serviceTeamId: string }
                | { measurementId: string }
                | undefined;

export enum UserPreference {
  /** Whether reopening the app should redirect to the last viewed document. */
  RememberLastPath = "rememberLastPath",
  /** If web-style hand pointer should be used on interactive elements. */
  UseCursorPointer = "useCursorPointer",
  /** Whether code blocks should show line numbers. */
  CodeBlockLineNumers = "codeBlockLineNumbers",
  /** Whether documents have a separate edit mode instead of always editing. */
  SeamlessEdit = "seamlessEdit",
  /** Whether documents should start in full-width mode. */
  FullWidthDocuments = "fullWidthDocuments",
  /** Whether to sort the comments by their order in the document. */
  SortCommentsByOrderInDocument = "sortCommentsByOrderInDocument",
  /** Whether smart text replacements should be enabled. */
  EnableSmartText = "enableSmartText",
  /** The style of notification badge to display. */
  NotificationBadge = "notificationBadge",
}

export enum NotificationBadgeType {
  /** Do not show a notification badge. */
  Disabled = "disabled",
  /** Show the unread notification count. */
  Count = "count",
  /** Show an unread indicator dot. */
  Indicator = "indicator",
}

export type UserPreferences = {
  [UserPreference.RememberLastPath]?: boolean;
  [UserPreference.UseCursorPointer]?: boolean;
  [UserPreference.CodeBlockLineNumers]?: boolean;
  [UserPreference.SeamlessEdit]?: boolean;
  [UserPreference.FullWidthDocuments]?: boolean;
  [UserPreference.SortCommentsByOrderInDocument]?: boolean;
  [UserPreference.EnableSmartText]?: boolean;
  [UserPreference.NotificationBadge]?: NotificationBadgeType;
};

export type SourceMetadata = {
  /** The original source file name. */
  fileName?: string;
  /** The original source mime type. */
  mimeType?: string;
  /** The creator of the original external source. */
  createdByName?: string;
  /** An ID in the external source. */
  externalId?: string;
  /** Original name in the external source. */
  externalName?: string;
  /** Whether the item was created through a trial license. */
  trial?: boolean;
  /** The ID of the original document when this document was duplicated. */
  originalDocumentId?: string;
};

export type CustomTheme = {
  accent: string;
  accentText: string;
};

export type PublicTeam = {
  avatarUrl: string;
  name: string;
  customTheme: Partial<CustomTheme>;
  tocPosition: TOCPosition;
};

export enum TOCPosition {
  Left = "left",
  Right = "right",
}

export enum EmailDisplay {
  None = "none",
  Members = "members",
  Everyone = "everyone",
}

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
  /** Whether users can comment on documents. */
  Commenting = "commenting",
  /** The custom theme for the team. */
  CustomTheme = "customTheme",
  /** Side to display the document's table of contents in relation to the main content. */
  TocPosition = "tocPosition",
  /** Whether to prevent shared documents from being embedded in iframes on external websites. */
  PreventDocumentEmbedding = "preventDocumentEmbedding",
  /** Who can see user email addresses. */
  EmailDisplay = "emailDisplay",
}

export type TeamPreferences = {
  [TeamPreference.SeamlessEdit]?: boolean;
  [TeamPreference.PublicBranding]?: boolean;
  [TeamPreference.ViewersCanExport]?: boolean;
  [TeamPreference.MembersCanInvite]?: boolean;
  [TeamPreference.MembersCanCreateApiKey]?: boolean;
  [TeamPreference.MembersCanDeleteAccount]?: boolean;
  [TeamPreference.PreviewsInEmails]?: boolean;
  [TeamPreference.Commenting]?: boolean;
  [TeamPreference.CustomTheme]?: Partial<CustomTheme>;
  [TeamPreference.TocPosition]?: TOCPosition;
  [TeamPreference.PreventDocumentEmbedding]?: boolean;
  [TeamPreference.EmailDisplay]?: EmailDisplay;
};

export enum NavigationNodeType {
  Collection = "collection",
  Document = "document",
  UserMembership = "userMembership",
  GroupMembership = "groupMembership",
}

export type NavigationNode = {
  id: string;
  title: string;
  url: string;
  emoji?: string;
  icon?: string;
  color?: string;
  children: NavigationNode[];
  isDraft?: boolean;
  collectionId?: string;
  type?: NavigationNodeType;
  parent?: NavigationNode | null;
  depth?: number;
};

export type CollectionSort = {
  field: string;
  direction: "asc" | "desc";
};

export enum SubscriptionType {
  Document = "documents.update",
}

export enum NotificationEventType {
  PublishDocument = "documents.publish",
  UpdateDocument = "documents.update",
  AddUserToDocument = "documents.add_user",
  AddUserToCollection = "collections.add_user",
  CreateRevision = "revisions.create",
  CreateCollection = "collections.create",
  CreateComment = "comments.create",
  ResolveComment = "comments.resolve",
  ReactionsCreate = "reactions.create",
  MentionedInDocument = "documents.mentioned",
  MentionedInComment = "comments.mentioned",
  GroupMentionedInDocument = "documents.group_mentioned",
  GroupMentionedInComment = "comments.group_mentioned",
  InviteAccepted = "emails.invite_accepted",
  Onboarding = "emails.onboarding",
  Features = "emails.features",
  ExportCompleted = "emails.export_completed",
}

export enum NotificationChannelType {
  App = "app",
  Email = "email",
  Chat = "chat",
}

export type NotificationData = {
  emoji?: string;
};

export type NotificationSettings = {
  [event in NotificationEventType]?:
    | {
        [type in NotificationChannelType]?: boolean;
      }
    | boolean;
};

export const NotificationEventDefaults: Record<NotificationEventType, boolean> =
  {
    [NotificationEventType.PublishDocument]: false,
    [NotificationEventType.UpdateDocument]: true,
    [NotificationEventType.CreateCollection]: false,
    [NotificationEventType.CreateComment]: true,
    [NotificationEventType.ResolveComment]: true,
    [NotificationEventType.ReactionsCreate]: true,
    [NotificationEventType.CreateRevision]: false,
    [NotificationEventType.MentionedInDocument]: true,
    [NotificationEventType.MentionedInComment]: true,
    [NotificationEventType.GroupMentionedInDocument]: true,
    [NotificationEventType.GroupMentionedInComment]: true,
    [NotificationEventType.InviteAccepted]: true,
    [NotificationEventType.Onboarding]: true,
    [NotificationEventType.Features]: true,
    [NotificationEventType.ExportCompleted]: true,
    [NotificationEventType.AddUserToDocument]: true,
    [NotificationEventType.AddUserToCollection]: true,
  };

export enum UnfurlResourceType {
  URL = "url",
  Mention = "mention",
  Group = "group",
  Document = "document",
  Issue = "issue",
  PR = "pull",
}

export type UnfurlResponse = {
  [UnfurlResourceType.URL]: {
    /** The resource type */
    type: UnfurlResourceType.URL;
    /** URL pointing to the resource */
    url: string;
    /** A text title, describing the resource */
    title: string;
    /** A brief description about the resource */
    description: string;
    /** A URL to a thumbnail image representing the resource */
    thumbnailUrl: string;
    /** A URL to a favicon representing the resource */
    faviconUrl: string;
  };
  [UnfurlResourceType.Mention]: {
    /** The resource type */
    type: UnfurlResourceType.Mention;
    /** Mentioned user's name */
    name: string;
    /** Mentioned user's email */
    email: string | null;
    /** Mentioned user's avatar URL */
    avatarUrl: string | null;
    /** Used to create mentioned user's avatar if no avatar URL provided */
    color: string;
    /** Mentiond user's recent activity */
    lastActive: string;
  };
  [UnfurlResourceType.Group]: {
    /** The resource type */
    type: UnfurlResourceType.Group;
    /** Group name */
    name: string;
    /** Group description */
    description: string | null;
    /** Number of members in the group */
    memberCount: number;
    /** Array of group members (limited to display count) */
    users: Array<{
      id: string;
      name: string;
      avatarUrl: string | null;
      color: string;
    }>;
  };
  [UnfurlResourceType.Document]: {
    /** The resource type */
    type: UnfurlResourceType.Document;
    /** URL pointing to the resource */
    url: string;
    /** Document id */
    id: string;
    /** Document title */
    title: string;
    /** Document summary */
    summary: string;
    /** Viewer's last activity on this document */
    lastActivityByViewer: string;
  };
  [UnfurlResourceType.Issue]: {
    /** The resource type */
    type: UnfurlResourceType.Issue;
    /** Issue link */
    url: string;
    /** Issue identifier */
    id: string;
    /** Issue title */
    title: string;
    /** Issue description */
    description: string | null;
    /** Issue's author */
    author: { name: string; avatarUrl: string };
    /** Issue's labels */
    labels: Array<{ name: string; color: string }>;
    /** Issue's status */
    state: {
      type?: string;
      name: string;
      color: string;
      completionPercentage?: number;
    };
    /** Issue's creation time */
    createdAt: string;
  };
  [UnfurlResourceType.PR]: {
    /** The resource type */
    type: UnfurlResourceType.PR;
    /** Pull Request link */
    url: string;
    /** Pull Request identifier */
    id: string;
    /** Pull Request title */
    title: string;
    /** Pull Request description */
    description: string | null;
    /** Pull Request author */
    author: { name: string; avatarUrl: string };
    /** Pull Request status */
    state: { name: string; color: string; draft?: boolean };
    /** Pull Request creation time */
    createdAt: string;
  };
};

export enum QueryNotices {
  UnsubscribeDocument = "unsubscribe-document",
  UnsubscribeCollection = "unsubscribe-collection",
}

export type JSONValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type JSONObject = { [x: string]: JSONValue };

export type ProsemirrorData = {
  type: string;
  content?: ProsemirrorData[];
  text?: string;
  attrs?: JSONObject;
  marks?: {
    type: string;
    attrs?: JSONObject;
  }[];
};

export type ProsemirrorDoc = {
  type: "doc";
  content: ProsemirrorData[];
};

export enum IconType {
  SVG = "svg",
  Emoji = "emoji",
  Custom = "custom",
}

/** Edit modes for document text updates. */
export enum TextEditMode {
  /** Replace existing content with new content (default). */
  Replace = "replace",
  /** Append new content to the end of the document. */
  Append = "append",
  /** Prepend new content to the beginning of the document. */
  Prepend = "prepend",
}

export enum EmojiCategory {
  People = "People",
  Nature = "Nature",
  Foods = "Foods",
  Activity = "Activity",
  Places = "Places",
  Objects = "Objects",
  Symbols = "Symbols",
  Flags = "Flags",
}

export enum EmojiSkinTone {
  Default = "Default",
  Light = "Light",
  MediumLight = "MediumLight",
  Medium = "Medium",
  MediumDark = "MediumDark",
  Dark = "Dark",
}

export type Emoji = {
  id: string;
  name: string;
  value: string;
};

export type EmojiVariants = {
  [EmojiSkinTone.Default]: Emoji;
  [EmojiSkinTone.Light]?: Emoji;
  [EmojiSkinTone.MediumLight]?: Emoji;
  [EmojiSkinTone.Medium]?: Emoji;
  [EmojiSkinTone.MediumDark]?: Emoji;
  [EmojiSkinTone.Dark]?: Emoji;
};

export type ReactionSummary = {
  emoji: string;
  userIds: string[];
};
