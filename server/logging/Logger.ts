/* eslint-disable no-console */
import { IncomingMessage } from "http";
import chalk from "chalk";
import { isEmpty, isArray, isObject, isString } from "lodash";
import winston from "winston";
import env from "@server/env";
import Metrics from "@server/logging/Metrics";
import Sentry from "@server/logging/sentry";
import * as Tracing from "./tracer";

const isProduction = env.ENVIRONMENT === "production";

type LogCategory =
  | "lifecycle"
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
  | "utils";
type Extra = Record<string, any>;

class Logger {
  output: winston.Logger;

  public constructor() {
    this.output = winston.createLogger({
      level: env.LOG_LEVEL,
    });
    this.output.add(
      new winston.transports.Console({
        format: isProduction
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
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  public debug(label: LogCategory, message: string, extra?: Extra) {
    this.output.debug(message, { ...this.sanitize(extra), label });
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

    if (isProduction) {
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

  /**
   * Sanitize data attached to logs and errors to remove sensitive information.
   *
   * @param input The data to sanitize
   * @returns The sanitized data
   */
  private sanitize<T>(input: T): T {
    // Short circuit if we're not in production to enable easier debugging
    if (!isProduction) {
      return input;
    }

    const sensitiveFields = [
      "accessToken",
      "refreshToken",
      "token",
      "password",
      "content",
    ];

    if (isString(input)) {
      if (sensitiveFields.some((field) => input.includes(field))) {
        return "[Filtered]" as any as T;
      }
    }

    if (isArray(input)) {
      return input.map(this.sanitize) as any as T;
    }

    if (isObject(input)) {
      const output = { ...input };

      for (const key of Object.keys(output)) {
        if (isObject(output[key])) {
          output[key] = this.sanitize(output[key]);
        } else if (isArray(output[key])) {
          output[key] = output[key].map(this.sanitize);
        } else if (sensitiveFields.includes(key)) {
          output[key] = "[Filtered]";
        } else {
          output[key] = this.sanitize(output[key]);
        }
      }
      return output;
    }

    return input;
  }
}

export default new Logger();
