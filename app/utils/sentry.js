// @flow
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import { type RouterHistory } from "react-router-dom";
import env from "env";

export function initSentry(history: RouterHistory) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    release: env.RELEASE,
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
