/* eslint-disable no-console */
import { IncomingMessage } from "http";
import chalk from "chalk";
import isArray from "lodash/isArray";
import isEmpty from "lodash/isEmpty";
import isObject from "lodash/isObject";
import winston from "winston";
import env from "@server/env";
import Metrics from "@server/logging/Metrics";
import Sentry from "@server/logging/sentry";
import ShutdownHelper from "@server/utils/ShutdownHelper";
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
                    label ? chalk.bold("[" + label + "] ") : ""
                  }${message} ${isEmpty(extra) ? "" : JSON.stringify(extra)}`
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

    if (env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setLevel("warning");

        for (const key in extra) {
          scope.setExtra(key, this.sanitize(extra[key]));
        }

        Sentry.captureMessage(message);
      });
    }

    if (env.isProduction) {
      this.output.warn(message, this.sanitize(extra));
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

    if (env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setLevel("error");

        for (const key in extra) {
          scope.setExtra(key, this.sanitize(extra[key]));
        }

        if (request) {
          scope.addEventProcessor((event) =>
            Sentry.Handlers.parseRequest(event, request)
          );
        }

        Sentry.captureException(error);
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
    void ShutdownHelper.execute();
  }

  /**
   * Sanitize data attached to logs and errors to remove sensitive information.
   *
   * @param input The data to sanitize
   * @returns The sanitized data
   */
  private sanitize = <T>(input: T, level = 0): T => {
    // Short circuit if we're not in production to enable easier debugging
    if (!env.isProduction) {
      return input;
    }

    const sensitiveFields = [
      "accessToken",
      "refreshToken",
      "token",
      "password",
      "content",
    ];

    if (level > 3) {
      return "[…]" as any as T;
    }

    if (isArray(input)) {
      return input.map((item) => this.sanitize(item, level + 1)) as any as T;
    }

    if (isObject(input)) {
      const output: Record<string, any> = { ...input };

      for (const key of Object.keys(output)) {
        if (isObject(output[key])) {
          output[key] = this.sanitize(output[key], level + 1);
        } else if (isArray(output[key])) {
          output[key] = output[key].map((value: unknown) =>
            this.sanitize(value, level + 1)
          );
        } else if (sensitiveFields.includes(key)) {
          output[key] = "[Filtered]";
        } else {
          output[key] = this.sanitize(output[key], level + 1);
        }
      }
      return output as T;
    }

    return input;
  };
}

export default new Logger();
