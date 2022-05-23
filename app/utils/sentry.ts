import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import { History } from "history";
import env from "~/env";

export function initSentry(history: History) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    release: env.RELEASE,
    integrations: [
      new Integrations.BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV5Instrumentation(history),
      }),
    ],
    tracesSampleRate: env.ENVIRONMENT === "production" ? 0.1 : 1,
    ignoreErrors: [
      "ResizeObserver loop completed with undelivered notifications",
      "ResizeObserver loop limit exceeded",
      "AuthorizationError",
      "BadRequestError",
      "NetworkError",
      "NotFoundError",
      "OfflineError",
      "ServiceUnavailableError",
      "UpdateRequiredError",
      "ChunkLoadError",
      "file://",
    ],
  });
}
