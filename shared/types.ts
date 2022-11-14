export type Role = "admin" | "viewer" | "member";

export type DateFilter = "day" | "week" | "month" | "year";

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
  DEFAULT_LANGUAGE: string;
  GOOGLE_ANALYTICS_ID: string | undefined;
  RELEASE: string | undefined;
};

export enum IntegrationType {
  Post = "post",
  Command = "command",
  Embed = "embed",
}

export enum CollectionPermission {
  Read = "read",
  ReadWrite = "read_write",
}

export type IntegrationSettings<T> = T extends IntegrationType.Embed
  ? { url: string }
  : T extends IntegrationType.Post
  ? { url: string; channel: string; channelId: string }
  : T extends IntegrationType.Post
  ? { serviceTeamId: string }
  :
      | { url: string }
      | { url: string; channel: string; channelId: string }
      | { serviceTeamId: string };

export enum UserPreference {
  /** Whether reopening the app should redirect to the last viewed document. */
  RememberLastPath = "rememberLastPath",
  /** If web-style hand pointer should be used on interactive elements. */
  UseCursorPointer = "useCursorPointer",
  CodeBlockLineNumers = "codeBlockLineNumbers",
}

export type UserPreferences = { [key in UserPreference]?: boolean };

export enum TeamPreference {
  /** Whether documents have a separate edit mode instead of seamless editing. */
  SeamlessEdit = "seamlessEdit",
  /** Whether to use team logo across the app for branding. */
  PublicBranding = "publicBranding",
  /** Whether viewers should see download options. */
  ViewersCanExport = "viewersCanExport",
  /** Whether users can comment on documents. */
  Commenting = "commenting",
}

export type TeamPreferences = { [key in TeamPreference]?: boolean };
