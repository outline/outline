// @flow

// Note: This entire object is stringified in the HTML exposed to the client
// do not add anything here that should be a secret or password
export default function present(env: Object): Object {
  return {
    URL: env.URL,
    CDN_URL: env.CDN_URL || "",
    WEBSOCKETS_URL: process.env.WEBSOCKETS_URL || "",
    DEPLOYMENT: env.DEPLOYMENT,
    ENVIRONMENT: env.NODE_ENV,
    SENTRY_DSN: env.SENTRY_DSN,
    TEAM_LOGO: env.TEAM_LOGO,
    SLACK_KEY: env.SLACK_KEY,
    SLACK_APP_ID: env.SLACK_APP_ID,
    MAXIMUM_IMPORT_SIZE: env.MAXIMUM_IMPORT_SIZE || 1024 * 1000 * 5,
    SUBDOMAINS_ENABLED: env.SUBDOMAINS_ENABLED === "true",
    GOOGLE_ANALYTICS_ID: env.GOOGLE_ANALYTICS_ID,
    RELEASE: env.SOURCE_COMMIT || env.SOURCE_VERSION || undefined,
  };
}
