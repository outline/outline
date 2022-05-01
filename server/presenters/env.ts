import { PublicEnv } from "@shared/types";
import { Environment } from "@server/env";

// Note: This entire object is stringified in the HTML exposed to the client
// do not add anything here that should be a secret or password
export default function present(env: Environment): PublicEnv {
  return {
    URL: env.URL.replace(/\/$/, ""),
    AWS_S3_UPLOAD_BUCKET_URL: process.env.AWS_S3_UPLOAD_BUCKET_URL || "",
    AWS_S3_ACCELERATE_URL: process.env.AWS_S3_ACCELERATE_URL || "",
    CDN_URL: (env.CDN_URL || "").replace(/\/$/, ""),
    COLLABORATION_URL: (env.COLLABORATION_URL || env.URL)
      .replace(/\/$/, "")
      .replace(/^http/, "ws"),
    DEPLOYMENT: env.DEPLOYMENT,
    ENVIRONMENT: env.ENVIRONMENT,
    SENTRY_DSN: env.SENTRY_DSN,
    TEAM_LOGO: env.TEAM_LOGO,
    SLACK_CLIENT_ID: env.SLACK_CLIENT_ID,
    SLACK_APP_ID: env.SLACK_APP_ID,
    MAXIMUM_IMPORT_SIZE: env.MAXIMUM_IMPORT_SIZE,
    SUBDOMAINS_ENABLED: env.SUBDOMAINS_ENABLED,
    DEFAULT_LANGUAGE: env.DEFAULT_LANGUAGE,
    EMAIL_ENABLED: !!env.SMTP_HOST || env.ENVIRONMENT === "development",
    GOOGLE_ANALYTICS_ID: env.GOOGLE_ANALYTICS_ID,
    RELEASE:
      process.env.SOURCE_COMMIT || process.env.SOURCE_VERSION || undefined,
  };
}
