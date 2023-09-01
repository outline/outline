import { IntegrationType, PublicEnv } from "@shared/types";
import { Environment } from "@server/env";
import { Integration } from "@server/models";

// Note: This entire object is stringified in the HTML exposed to the client
// do not add anything here that should be a secret or password
export default function present(
  env: Environment,
  analytics?: Integration<IntegrationType.Analytics> | null
): PublicEnv {
  return {
    URL: env.URL.replace(/\/$/, ""),
    AWS_S3_UPLOAD_BUCKET_URL: env.AWS_S3_UPLOAD_BUCKET_URL || "",
    AWS_S3_ACCELERATE_URL: env.AWS_S3_ACCELERATE_URL || "",
    CDN_URL: (env.CDN_URL || "").replace(/\/$/, ""),
    COLLABORATION_URL: (env.COLLABORATION_URL || env.URL)
      .replace(/\/$/, "")
      .replace(/^http/, "ws"),
    ENVIRONMENT: env.ENVIRONMENT,
    SENTRY_DSN: env.SENTRY_DSN,
    SENTRY_TUNNEL: env.SENTRY_TUNNEL,
    SLACK_CLIENT_ID: env.SLACK_CLIENT_ID,
    SLACK_APP_ID: env.SLACK_APP_ID,
    MAXIMUM_IMPORT_SIZE: env.MAXIMUM_IMPORT_SIZE,
    PDF_EXPORT_ENABLED: false,
    DEFAULT_LANGUAGE: env.DEFAULT_LANGUAGE,
    EMAIL_ENABLED: !!env.SMTP_HOST || env.ENVIRONMENT === "development",
    GOOGLE_ANALYTICS_ID: env.GOOGLE_ANALYTICS_ID,
    RELEASE:
      process.env.SOURCE_COMMIT || process.env.SOURCE_VERSION || undefined,
    APP_NAME: env.APP_NAME,
    analytics: {
      service: analytics?.service,
      settings: analytics?.settings,
    },
  };
}
