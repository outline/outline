/* oxlint-disable no-console */
import type { IncomingMessage } from "node:http";
import { styleText } from "node:util";
import { isEmpty } from "es-toolkit/compat";
import winston from "winston";
import env from "@server/env";
import Metrics from "@server/logging/Metrics";
import Sentry from "@server/logging/sentry";
import { ShutdownHelper } from "@server/utils/ShutdownHelper";
import { sanitize } from "./sanitize";
import * as Tracing from "./tracer";

type LogCategory =
  | "lifecycle"
  | "authentication"
  | "multiplayer"
  | "http"
  | "commands"
  | "worker"
  | "task"
  | "processor"
  | "email"
  | "queue"
  | "websockets"
  | "database"
  | "utils"
  | "plugins";

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
type Extra = Record<string, any>;

class Logger {
  output: winston.Logger;

  public constructor() {
    this.output = winston.createLogger({
      // The check for log level validity is here in addition to the ENV validation
      // as entering an incorrect LOG_LEVEL in env could otherwise prevent the
      // related error message from being displayed.
      level: [
        "error",
        "warn",
        "info",
        "http",
        "verbose",
        "debug",
        "silly",
      ].includes(env.LOG_LEVEL)
        ? env.LOG_LEVEL
        : "info",
    });

    this.output.add(
      new winston.transports.Console({
        format: env.isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ message, level, label, ...extra }) =>
                  `${level}: ${
                    label ? styleText("bold", `[${label as string}] `) : ""
                  }${message as string} ${isEmpty(extra) ? "" : JSON.stringify(extra)}`
              )
            ),
      })
    );

    if (
      env.DEBUG &&
      env.DEBUG !== "http" &&
      !["silly", "debug"].includes(env.LOG_LEVEL)
    ) {
      this.warn(
        `"DEBUG" set in configuration but the "LOG_LEVEL" configuration is filtering debug messages. To see all logging, set "LOG_LEVEL" to "debug".`
      );
    }
  }

  /**
   * Log information
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  public info(label: LogCategory, message: string, extra?: Extra) {
    this.output.info(message, { ...this.sanitize(extra), label });
  }

  /**
   * Debug information
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged that will appear in development logs
   */
  public debug(label: LogCategory, message: string, extra?: Extra) {
    this.output.debug(message, { ...this.sanitize(extra), label });
  }

  /**
   * Detailed information – for very detailed logs, more detailed than debug. "silly" is the
   * lowest priority npm log level.
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged that will appear in verbose logs
   */
  public silly(label: LogCategory, message: string, extra?: Extra) {
    this.output.silly(message, { ...this.sanitize(extra), label });
  }

  /**
   * Log a warning
   *
   * @param message A warning message
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  public warn(message: string, extra?: Extra) {
    Metrics.increment("logger.warning");
    this.output.warn(message, this.sanitize(extra));
  }

  /**
   * Report a runtime error
   *
   * @param message A description of the error
   * @param error The error that occurred
   * @param extra Arbitrary data to be logged that will appear in prod logs
   * @param request An optional request object to attach to the error
   */
  public error(
    message: string,
    error: Error,
    extra?: Extra,
    request?: IncomingMessage
  ) {
    Metrics.increment("logger.error", {
      name: error.name,
    });
    Tracing.setError(error);

    const sentry = Sentry;
    if (sentry) {
      sentry.withScope((scope) => {
        scope.setLevel("error");

        const sanitizedExtra = this.sanitize(extra);
        for (const key in sanitizedExtra) {
          scope.setExtra(key, sanitizedExtra[key]);
        }

        if (request) {
          scope.setSDKProcessingMetadata({ request });
        }

        sentry.captureException(error);
      });
    }

    if (env.isProduction) {
      this.output.error(message, {
        error: error.message,
        stack: error.stack,
      });
    } else {
      console.error(message);
      console.error(error);

      if (extra) {
        console.error(extra);
      }
    }
  }

  /**
   * Report a fatal error and shut down the server
   *
   * @param message A description of the error
   * @param error The error that occurred
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  public fatal(message: string, error: Error, extra?: Extra) {
    this.error(message, error, extra);
    void ShutdownHelper.execute(1);
  }

  /**
   * Sanitize data attached to logs and errors to remove sensitive information.
   *
   * @param input The data to sanitize
   * @returns The sanitized data
   */
  private sanitize = <T>(input: T): T => {
    // Short circuit if we're not in production to enable easier debugging
    if (!env.isProduction && !(input instanceof Error)) {
      return input;
    }

    return sanitize(input);
  };
}

export default new Logger();
