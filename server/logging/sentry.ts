import cluster from "node:cluster";
import type * as SentryNode from "@sentry/node";
import env from "@server/env";
import type { AppContext } from "@server/types";

// Sentry is only loaded in worker processes, as it is comparatively expensive
// and the cluster primary only supervises the forked workers.
const Sentry =
  env.SENTRY_DSN && cluster.isWorker ? loadSentry(env.SENTRY_DSN) : undefined;

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export function requestErrorHandler(error: any, ctx: AppContext) {
  // we don't need to report every time a request stops to the bug tracker
  if (error.code === "EPIPE" || error.code === "ECONNRESET") {
    return;
  }

  if (Sentry) {
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

      scope.setSDKProcessingMetadata({ request: ctx.req });
      Sentry.captureException(error);
    });
  } else if (env.ENVIRONMENT !== "test") {
    // oxlint-disable-next-line no-console
    console.error(error);
  }
}

export default Sentry;

function loadSentry(dsn: string): typeof SentryNode {
  // oxlint-disable-next-line typescript/no-require-imports -- kept lazy so Sentry stays off the startup path
  const sentry = require("@sentry/node") as typeof SentryNode;
  sentry.init({
    dsn,
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

      // Client disconnects
      "Premature close",
    ],
    beforeSend(event) {
      try {
        switch (event.level) {
          case "warning":
            // Sample warnings to reduce noise
            if (Math.random() < 0.1) {
              return null;
            }
            break;
        }
        return event;
      } catch (_) {
        return event;
      }
    },
  });
  return sentry;
}
