// @flow
import * as Sentry from "@sentry/node";
import env from "./env";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    release: env.RELEASE,
    maxBreadcrumbs: 0,
    ignoreErrors: [
      // emitted by Koa when bots attempt to snoop on paths such as wp-admin
      // or the user client submits a bad request. These are expected in normal
      // running of the application and don't need to be reported.
      "BadRequestError",
      "UnauthorizedError",
    ],
  });
}

export default Sentry;
