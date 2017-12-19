// @flow
declare var __DEV__: string;
declare var SLACK_KEY: string;
declare var SLACK_APP_ID: string;
declare var BASE_URL: string;
declare var BUGSNAG_KEY: ?string;
declare var DEPLOYMENT: string;
declare var Bugsnag: any;
declare var process: {
  env: {
    [string]: string,
  },
};
