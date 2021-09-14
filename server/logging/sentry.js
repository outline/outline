// @flow
import * as Sentry from "@sentry/node";
import env from "../env";
import type { ContextWithState } from "../types";

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

export function requestErrorHandler(error: any, ctx: ContextWithState) {
  // we don't need to report every time a request stops to the bug tracker
  if (error.code === "EPIPE" || error.code === "ECONNRESET") {
    console.warn("Connection error", { error });
    return;
  }

  if (process.env.SENTRY_DSN) {
    Sentry.withScope(function (scope) {
      const requestId = ctx.headers["x-request-id"];
      if (requestId) {
        scope.setTag("request_id", requestId);
      }

      const authType = ctx.state ? ctx.state.authType : undefined;
      if (authType) {
        scope.setTag("auth_type", authType);
      }

      const userId =
        ctx.state && ctx.state.user ? ctx.state.user.id : undefined;
      if (userId) {
        scope.setUser({ id: userId });
      }

      scope.addEventProcessor(function (event) {
        return Sentry.Handlers.parseRequest(event, ctx.request);
      });
      Sentry.captureException(error);
    });
  } else {
    console.error(error);
  }
}

export default Sentry;
