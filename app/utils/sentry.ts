import { BrowserTracing } from "@sentry/browser";
import * as Sentry from "@sentry/react";
import { History } from "history";
import env from "~/env";
import {
  AuthorizationError,
  BadRequestError,
  NetworkError,
  NotFoundError,
  OfflineError,
  RateLimitExceededError,
  ServiceUnavailableError,
  UpdateRequiredError,
} from "./errors";

export function initSentry(history: History) {
  function filterFromClass(error: new (...args: any[]) => Error) {
    return new RegExp(`/^${error.name}:.*$/`);
  }

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
      filterFromClass(AuthorizationError),
      filterFromClass(BadRequestError),
      filterFromClass(NetworkError),
      filterFromClass(NotFoundError),
      filterFromClass(OfflineError),
      filterFromClass(RateLimitExceededError),
      filterFromClass(ServiceUnavailableError),
      filterFromClass(UpdateRequiredError),
    ],
  });
}
