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
import { staleChunkErrorPattern } from "@shared/utils/lazyWithRetry";

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

  // Matched by name, as scripts that wrap the Error constructor break instanceof.
  const ignoredErrorNames = new Set(
    ignoredErrorTypes.map((Type) => new Type().name)
  );

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
      // Telegram's Android in-app browser calls a missing native bridge method
      /Error invoking post\w*: Method not found/,
      // Injected scripts calling eval are blocked by our CSP, the app never uses eval
      /evaluate a string as JavaScript/,
      // Safari web extensions messaging a closed tab
      "Invalid call to runtime.sendMessage(). Tab not found.",
      // Chrome extensions messaging a closed tab
      "Could not establish connection. Receiving end does not exist.",
      // Extensions rejecting promises with an event rather than an error
      /Event `CustomEvent` \(type=unhandledrejection\) captured as promise rejection/,
      // View transitions are skipped when the page changes underneath them
      "Transition was aborted because of invalid state",
      "file://",
      "chrome-extension://",
    ],
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof Error && ignoredErrorNames.has(error.name)) {
        return null;
      }
      if (isTranslatedPageError(error)) {
        return null;
      }
      return event;
    },
  });
}

/**
 * Checks if an error is a DOM mutation failure on a page that a browser
 * translation tool has changed. These tools replace text nodes that React
 * still references, so later React updates fail.
 *
 * @param error the error to check.
 * @returns true if the error is caused by page translation.
 */
export function isTranslatedPageError(error: unknown) {
  return (
    error instanceof DOMException &&
    error.name === "NotFoundError" &&
    /'(removeChild|insertBefore)' on 'Node'/.test(error.message) &&
    isPageTranslated()
  );
}

function isPageTranslated() {
  const root = document.documentElement;
  return (
    // Google Translate, built into Chrome
    root.classList.contains("translated-ltr") ||
    root.classList.contains("translated-rtl") ||
    // Microsoft Translator, built into Edge
    document.querySelector("[_msttexthash]") !== null ||
    // Other translators wrap text in font elements, which the app never renders
    document.querySelector("font") !== null
  );
}
