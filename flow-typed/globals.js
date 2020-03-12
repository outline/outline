// @flow
declare var __DEV__: string;
declare var SLACK_KEY: string;
declare var SLACK_APP_ID: string;
declare var BASE_URL: string;
declare var SENTRY_DSN: ?string;
declare var DEPLOYMENT: string;
declare var Sentry: any;
declare var process: {
  env: {
    [string]: string,
  },
};
