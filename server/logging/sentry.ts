import * as Sentry from "@sentry/node";
import env from "@server/env";
import { ContextWithState } from "../types";

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
    console.warn("Connection error", {
      error,
    });
    return;
  }

  if (env.SENTRY_DSN) {
    Sentry.withScope(function (scope) {
      const requestId = ctx.headers["x-request-id"];

      if (requestId) {
        scope.setTag("request_id", requestId as string);
      }

      const authType = ctx.state?.authType ?? undefined;
      if (authType) {
        scope.setTag("auth_type", authType);
      }

      const teamId = ctx.state?.user?.teamId ?? undefined;
      if (teamId) {
        scope.setTag("team_id", teamId);
      }

      const userId = ctx.state?.user?.id ?? undefined;
      if (userId) {
        scope.setUser({
          id: userId,
        });
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
