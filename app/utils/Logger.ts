import * as Sentry from "@sentry/react";
import env from "~/env";

type LogCategory =
  | "lifecycle"
  | "http"
  | "editor"
  | "router"
  | "collaboration"
  | "misc";

type Extra = Record<string, any>;

class Logger {
  /**
   * Log information
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  info(label: LogCategory, message: string, extra?: Extra) {
    console.info(`[${label}] ${message}`, extra);
  }

  /**
   * Debug information
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged
   */
  debug(label: LogCategory, message: string, extra?: Extra) {
    if (env.ENVIRONMENT === "development") {
      console.debug(`[${label}] ${message}`, extra);
    }
  }

  /**
   * Log a warning
   *
   * @param message A warning message
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  warn(message: string, extra?: Extra) {
    if (env.SENTRY_DSN) {
      Sentry.withScope(function (scope) {
        scope.setLevel(Sentry.Severity.Warning);

        for (const key in extra) {
          scope.setExtra(key, extra[key]);
        }

        Sentry.captureMessage(message);
      });
    }

    console.warn(message, extra);
  }

  /**
   * Report a runtime error
   *
   * @param message A description of the error
   * @param error The error that occurred
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  error(message: string, error: Error, extra?: Extra) {
    if (env.SENTRY_DSN) {
      Sentry.withScope(function (scope) {
        scope.setLevel(Sentry.Severity.Error);

        for (const key in extra) {
          scope.setExtra(key, extra[key]);
        }

        Sentry.captureException(error);
      });
    }

    console.error(message, {
      error,
      extra,
    });
  }
}

export default new Logger();
