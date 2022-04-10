import chalk from "chalk";
import winston from "winston";
import env from "@server/env";
import Metrics from "@server/logging/metrics";
import Sentry from "@server/logging/sentry";

const isProduction = env.NODE_ENV === "production";
type LogCategory =
  | "lifecycle"
  | "hocuspocus"
  | "http"
  | "commands"
  | "processor"
  | "task"
  | "email"
  | "queue"
  | "database"
  | "utils";
type Extra = Record<string, any>;

class Logger {
  output: winston.Logger;

  constructor() {
    this.output = winston.createLogger();
    this.output.add(
      new winston.transports.Console({
        format: isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ message, level, label }) =>
                  `${level}: ${
                    label ? chalk.bold("[" + label + "] ") : ""
                  }${message}`
              )
            ),
      })
    );
  }

  /**
   * Log information
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  info(label: LogCategory, message: string, extra?: Extra) {
    this.output.info(message, { ...extra, label });
  }

  /**
   * Debug information
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  debug(label: LogCategory, message: string, extra?: Extra) {
    this.output.debug(message, { ...extra, label });
  }

  /**
   * Log a warning
   *
   * @param message A warning message
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  warn(message: string, extra?: Extra) {
    Metrics.increment("logger.warning");

    if (process.env.SENTRY_DSN) {
      Sentry.withScope(function (scope) {
        for (const key in extra) {
          scope.setExtra(key, extra[key]);
          scope.setLevel(Sentry.Severity.Warning);
        }

        Sentry.captureMessage(message);
      });
    }

    if (isProduction) {
      this.output.warn(message, extra);
    } else if (extra) {
      console.warn(message, extra);
    } else {
      console.warn(message);
    }
  }

  /**
   * Report a runtime error
   *
   * @param message A description of the error
   * @param error The error that occurred
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  error(message: string, error: Error, extra?: Extra) {
    Metrics.increment("logger.error");

    if (process.env.SENTRY_DSN) {
      Sentry.withScope(function (scope) {
        for (const key in extra) {
          scope.setExtra(key, extra[key]);
          scope.setLevel(Sentry.Severity.Error);
        }

        Sentry.captureException(error);
      });
    }

    if (isProduction) {
      this.output.error(message, {
        error: error.message,
        stack: error.stack,
      });
    } else {
      console.error(message, {
        error,
        extra,
      });
    }
  }
}

export default new Logger();
