import { BrowserTracing } from "@sentry/browser";
import * as Sentry from "@sentry/react";
import type { History } from "history";
import env from "~/env";
import {
  AuthorizationError,
  BadRequestError,
  NetworkError,
  NotFoundError,
  OfflineError,
  PaymentRequiredError,
  RateLimitExceededError,
  ServiceUnavailableError,
  UpdateRequiredError,
} from "./errors";

export function initSentry(history: History) {
  const ignoredErrorTypes = [
    AuthorizationError,
    BadRequestError,
    NetworkError,
    NotFoundError,
    OfflineError,
    PaymentRequiredError,
    RateLimitExceededError,
    ServiceUnavailableError,
    UpdateRequiredError,
  ];

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    release: env.VERSION,
    tunnel: env.SENTRY_TUNNEL,
    allowUrls: [env.URL, env.CDN_URL, env.COLLABORATION_URL],
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV5Instrumentation(history),
      }),
    ],
    tracesSampleRate: env.ENVIRONMENT === "production" ? 0.1 : 1,
    ignoreErrors: [
      "Failed to fetch dynamically imported module",
      "ResizeObserver loop completed with undelivered notifications",
      "ResizeObserver loop limit exceeded",
      "file://",
      "chrome-extension://",
    ],
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error && ignoredErrorTypes.some((type) => error instanceof type)) {
        return null;
      }
      return event;
    },
  });
}
