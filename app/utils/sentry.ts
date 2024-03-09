import { BrowserTracing } from "@sentry/browser";
import * as Sentry from "@sentry/react";
import { History } from "history";
import env from "~/env";

export function initSentry(history: History) {
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
      "AuthorizationError",
      "BadRequestError",
      "NetworkError",
      "NotFoundError",
      "OfflineError",
      "RateLimitExceededError",
      "ServiceUnavailableError",
      "UpdateRequiredError",
      "file://",
      "chrome-extension://",
    ],
  });
}
