import * as Sentry from "@sentry/react";
import type { History } from "history";
import env from "~/env";
import {
  AuthorizationError,
  BadRequestError,
  ClientClosedRequestError,
  NetworkError,
  NotFoundError,
  OfflineError,
  PaymentRequiredError,
  RateLimitExceededError,
  ServiceUnavailableError,
  UpdateRequiredError,
} from "./errors";
import { staleChunkErrorPattern } from "./lazyWithRetry";

/**
 * Initializes the Sentry error tracking client for the browser.
 *
 * @param history the router history used for navigation instrumentation.
 */
export function initSentry(history: History) {
  const ignoredErrorTypes = [
    AuthorizationError,
    BadRequestError,
    ClientClosedRequestError,
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
    integrations: [Sentry.reactRouterV5BrowserTracingIntegration({ history })],
    ignoreSpans: [
      // Resource timing spans are emitted for every subresource of a pageload (scripts)
      { op: /^resource\./ },
      // Connection phases of a pageload, per Sentry's recommended defaults
      { op: /^browser\.(cache|connect|DNS)$/ },
      // Performance marks and measures are mostly emitted by third-party browser extensions
      { op: /^(mark|measure)$/ },
    ],
    tracesSampleRate: env.ENVIRONMENT === "production" ? 0.05 : 1,
    ignoreErrors: [
      staleChunkErrorPattern,
      "ResizeObserver loop completed with undelivered notifications",
      "ResizeObserver loop limit exceeded",
      "Object Not Found Matching Id",
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
