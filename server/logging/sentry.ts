import * as Sentry from "@sentry/node";
import env from "@server/env";
import { AppContext } from "@server/types";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    release: env.RELEASE,
    maxBreadcrumbs: 0,
    ignoreErrors: [
      // These errors are expected in normal running of the application and
      // don't need to be reported.
      // Validation
      "BadRequestError",
      "SequelizeValidationError",
      "SequelizeEmptyResultError",
      "ValidationError",
      "ForbiddenError",

      // Authentication
      "UnauthorizedError",
      "TeamDomainRequiredError",
      "GmailAccountCreationError",
      "AuthRedirectError",
      "UserSuspendedError",
      "TooManyRequestsError",
    ],
  });
}

export function requestErrorHandler(error: any, ctx: AppContext) {
  // we don't need to report every time a request stops to the bug tracker
  if (error.code === "EPIPE" || error.code === "ECONNRESET") {
    return;
  }

  if (env.SENTRY_DSN) {
    Sentry.withScope(function (scope) {
      const requestId = ctx.headers["x-request-id"];

      if (requestId) {
        scope.setTag("request_id", requestId as string);
      }

      const authType = ctx.state?.auth?.type ?? undefined;
      if (authType) {
        scope.setTag("auth_type", authType);
      }

      const teamId = ctx.state?.auth?.user?.teamId ?? undefined;
      if (teamId) {
        scope.setTag("team_id", teamId);
      }

      const userId = ctx.state?.auth?.user?.id ?? undefined;
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
  } else if (env.ENVIRONMENT !== "test") {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

export default Sentry;
