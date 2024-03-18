export enum UserRole {
  Admin = "admin",
  Member = "member",
  Viewer = "viewer",
}

export type DateFilter = "day" | "week" | "month" | "year";

export enum StatusFilter {
  Published = "published",
  Archived = "archived",
  Draft = "draft",
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

export enum MentionType {
  User = "user",
}

export type PublicEnv = {
  ROOT_SHARE_ID?: string;
  analytics: {
    service?: IntegrationService;
    settings?: IntegrationSettings<IntegrationType.Analytics>;
  };
};

export enum AttachmentPreset {
  DocumentAttachment = "documentAttachment",
  WorkspaceImport = "workspaceImport",
  Import = "import",
  Avatar = "avatar",
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
}

export enum IntegrationService {
  Diagrams = "diagrams",
  Grist = "grist",
  Slack = "slack",
  GoogleAnalytics = "google-analytics",
}

export type UserCreatableIntegrationService = Extract<
  IntegrationService,
  | IntegrationService.Diagrams
  | IntegrationService.Grist
  | IntegrationService.GoogleAnalytics
>;

export const UserCreatableIntegrationService = {
  Diagrams: IntegrationService.Diagrams,
  Grist: IntegrationService.Grist,
  GoogleAnalytics: IntegrationService.GoogleAnalytics,
} as const;

export enum CollectionPermission {
  Read = "read",
  ReadWrite = "read_write",
  Admin = "admin",
}

export enum DocumentPermission {
  Read = "read",
  ReadWrite = "read_write",
}

export type IntegrationSettings<T> = T extends IntegrationType.Embed
  ? { url: string }
  : T extends IntegrationType.Analytics
  ? { measurementId: string }
  : T extends IntegrationType.Post
  ? { url: string; channel: string; channelId: string }
  : T extends IntegrationType.Command
  ? { serviceTeamId: string }
  :
      | { url: string }
      | { url: string; channel: string; channelId: string }
      | { serviceTeamId: string }
      | { measurementId: string }
      | { slack: { serviceTeamId: string; serviceUserId: string } }
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
}

export type UserPreferences = { [key in UserPreference]?: boolean };

export type SourceMetadata = {
  /** The original source file name. */
  fileName?: string;
  /** The original source mime type. */
  mimeType?: string;
  /** The creator of the original external source. */
  createdByName?: string;
  /** An ID in the external source. */
  externalId?: string;
  /** Whether the item was created through a trial license. */
  trial?: boolean;
};

export type CustomTheme = {
  accent: string;
  accentText: string;
};

export type PublicTeam = {
  avatarUrl: string;
  name: string;
  customTheme: Partial<CustomTheme>;
};

export enum TeamPreference {
  /** Whether documents have a separate edit mode instead of always editing. */
  SeamlessEdit = "seamlessEdit",
  /** Whether to use team logo across the app for branding. */
  PublicBranding = "publicBranding",
  /** Whether viewers should see download options. */
  ViewersCanExport = "viewersCanExport",
  /** Whether members can invite new users. */
  MembersCanInvite = "membersCanInvite",
  /** Whether users can comment on documents. */
  Commenting = "commenting",
  /** The custom theme for the team. */
  CustomTheme = "customTheme",
}

export type TeamPreferences = {
  [TeamPreference.SeamlessEdit]?: boolean;
  [TeamPreference.PublicBranding]?: boolean;
  [TeamPreference.ViewersCanExport]?: boolean;
  [TeamPreference.MembersCanInvite]?: boolean;
  [TeamPreference.Commenting]?: boolean;
  [TeamPreference.CustomTheme]?: Partial<CustomTheme>;
};

export enum NavigationNodeType {
  Collection = "collection",
  Document = "document",
}

export type NavigationNode = {
  id: string;
  title: string;
  url: string;
  emoji?: string;
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

export enum NotificationEventType {
  PublishDocument = "documents.publish",
  UpdateDocument = "documents.update",
  AddUserToDocument = "documents.add_user",
  AddUserToCollection = "collections.add_user",
  CreateRevision = "revisions.create",
  CreateCollection = "collections.create",
  CreateComment = "comments.create",
  MentionedInDocument = "documents.mentioned",
  MentionedInComment = "comments.mentioned",
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

export type NotificationSettings = {
  [event in NotificationEventType]?:
    | {
        [type in NotificationChannelType]?: boolean;
      }
    | boolean;
};

export const NotificationEventDefaults = {
  [NotificationEventType.PublishDocument]: false,
  [NotificationEventType.UpdateDocument]: true,
  [NotificationEventType.CreateCollection]: false,
  [NotificationEventType.CreateComment]: true,
  [NotificationEventType.MentionedInDocument]: true,
  [NotificationEventType.MentionedInComment]: true,
  [NotificationEventType.InviteAccepted]: true,
  [NotificationEventType.Onboarding]: true,
  [NotificationEventType.Features]: true,
  [NotificationEventType.ExportCompleted]: true,
  [NotificationEventType.AddUserToDocument]: true,
  [NotificationEventType.AddUserToCollection]: true,
};

export enum UnfurlType {
  Mention = "mention",
  Document = "document",
}

export enum QueryNotices {
  UnsubscribeDocument = "unsubscribe-document",
}

export type OEmbedType = "photo" | "video" | "rich";

export type Unfurl<T = OEmbedType> =
  | {
      url?: string;
      type: T;
      title: string;
      description?: string;
      thumbnailUrl?: string | null;
      meta?: Record<string, string>;
    }
  | {
      error: string;
    };

export type UnfurlSignature = (url: string) => Promise<Unfurl | false>;

export type JSONValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type JSONObject = { [x: string]: JSONValue };

export type ProsemirrorData = JSONObject;
