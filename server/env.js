// @flow
export default {
  URL: process.env.URL,
  DEPLOYMENT: process.env.DEPLOYMENT,
  SENTRY_DSN: process.env.SENTRY_DSN,
  TEAM_LOGO: process.env.TEAM_LOGO,
  SLACK_KEY: process.env.SLACK_KEY,
  SLACK_APP_ID: process.env.SLACK_APP_ID,
  SUBDOMAINS_ENABLED: process.env.SUBDOMAINS_ENABLED === "true",
  GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
};
