// @flow
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import { type RouterHistory } from "react-router-dom";

export function initSentry(history: RouterHistory) {
  Sentry.init({
    dsn: process.env.GATSBY_SENTRY_DSN,
    environment: process.env.ENVIRONMENT,
    release: process.env.RELEASE,
    integrations: [
      new Integrations.BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV5Instrumentation(history),
      }),
    ],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
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
    ],
  });
}
