export type Role = "admin" | "viewer" | "member";

export type DateFilter = "day" | "week" | "month" | "year";

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
  URL: string;
  CDN_URL: string;
  COLLABORATION_URL: string;
  AWS_S3_UPLOAD_BUCKET_URL: string;
  AWS_S3_ACCELERATE_URL: string;
  DEPLOYMENT: string | undefined;
  ENVIRONMENT: string;
  SENTRY_DSN: string | undefined;
  SENTRY_TUNNEL: string | undefined;
  SLACK_CLIENT_ID: string | undefined;
  SLACK_APP_ID: string | undefined;
  MAXIMUM_IMPORT_SIZE: number;
  SUBDOMAINS_ENABLED: boolean;
  EMAIL_ENABLED: boolean;
  PDF_EXPORT_ENABLED: boolean;
  DEFAULT_LANGUAGE: string;
  GOOGLE_ANALYTICS_ID: string | undefined;
  RELEASE: string | undefined;
  APP_NAME: string;
  analytics: {
    service?: IntegrationService;
    settings?: IntegrationSettings<IntegrationType.Analytics>;
  };
};

export enum AttachmentPreset {
  DocumentAttachment = "documentAttachment",
  Import = "import",
  Avatar = "avatar",
}

export enum IntegrationType {
  Post = "post",
  Command = "command",
  Embed = "embed",
  Analytics = "analytics",
}

export enum IntegrationService {
  Diagrams = "diagrams",
  Slack = "slack",
  GoogleAnalytics = "google-analytics",
}

export enum CollectionPermission {
  Read = "read",
  ReadWrite = "read_write",
  Admin = "admin",
}

export type IntegrationSettings<T> = T extends IntegrationType.Embed
  ? { url: string }
  : T extends IntegrationType.Analytics
  ? { measurementId: string }
  : T extends IntegrationType.Post
  ? { url: string; channel: string; channelId: string }
  : T extends IntegrationType.Post
  ? { serviceTeamId: string }
  :
      | { url: string }
      | { url: string; channel: string; channelId: string }
      | { serviceTeamId: string }
      | { measurementId: string };

export enum UserPreference {
  /** Whether reopening the app should redirect to the last viewed document. */
  RememberLastPath = "rememberLastPath",
  /** If web-style hand pointer should be used on interactive elements. */
  UseCursorPointer = "useCursorPointer",
  /** Whether code blocks should show line numbers. */
  CodeBlockLineNumers = "codeBlockLineNumbers",
}

export type UserPreferences = { [key in UserPreference]?: boolean };

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
  /** Whether documents have a separate edit mode instead of seamless editing. */
  SeamlessEdit = "seamlessEdit",
  /** Whether to use team logo across the app for branding. */
  PublicBranding = "publicBranding",
  /** Whether viewers should see download options. */
  ViewersCanExport = "viewersCanExport",
  /** Whether users can comment on documents. */
  Commenting = "commenting",
  /** The custom theme for the team. */
  CustomTheme = "customTheme",
}

export type TeamPreferences = {
  [TeamPreference.SeamlessEdit]?: boolean;
  [TeamPreference.PublicBranding]?: boolean;
  [TeamPreference.ViewersCanExport]?: boolean;
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
  [key in NotificationEventType]?:
    | {
        [key in NotificationChannelType]?: boolean;
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
};
