// @flow

// Note: This entire object is stringified in the HTML exposed to the client
// do not add anything here that should be a secret or password
export default {
  URL: process.env.URL,
  CDN_URL: process.env.CDN_URL || "",
  DEPLOYMENT: process.env.DEPLOYMENT,
  ENVIRONMENT: process.env.NODE_ENV,
  SENTRY_DSN: process.env.SENTRY_DSN,
  TEAM_LOGO: process.env.TEAM_LOGO,
  SLACK_KEY: process.env.SLACK_KEY,
  SLACK_APP_ID: process.env.SLACK_APP_ID,
  MAXIMUM_IMPORT_SIZE: process.env.MAXIMUM_IMPORT_SIZE || 1024 * 1000 * 5,
  SUBDOMAINS_ENABLED: process.env.SUBDOMAINS_ENABLED === "true",
  GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
  RELEASE: process.env.SOURCE_COMMIT || process.env.SOURCE_VERSION || undefined,
};
