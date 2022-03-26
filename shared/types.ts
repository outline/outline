export type Role = "admin" | "viewer" | "member";

export type DateFilter = "day" | "week" | "month" | "year";

export type PublicEnv = {
  URL: string;
  CDN_URL: string;
  COLLABORATION_URL: string;
  DEPLOYMENT: "hosted" | "";
  ENVIRONMENT: "production" | "development";
  SENTRY_DSN: string | undefined;
  TEAM_LOGO: string | undefined;
  SLACK_KEY: string | undefined;
  SLACK_APP_ID: string | undefined;
  MAXIMUM_IMPORT_SIZE: number;
  SUBDOMAINS_ENABLED: boolean;
  EMAIL_ENABLED: boolean;
  GOOGLE_ANALYTICS_ID: string | undefined;
  RELEASE: string | undefined;
};
