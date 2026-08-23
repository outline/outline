import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import formidable from "formidable";
import type Koa from "koa";
import { escape, isNil, snakeCase } from "es-toolkit/compat";
import env from "@server/env";
import {
  ClientClosedRequestError,
  InternalError,
  RequestTimeoutError,
} from "@server/errors";
import { requestErrorHandler } from "@server/logging/sentry";
import { isQueryCanceledError } from "@server/storage/database";
import type { AppContext } from "@server/types";

let errorHtmlCache: Buffer | undefined;

export default function onerror(app: Koa) {
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  app.context.onerror = function (this: AppContext, err: any) {
    // Don't do anything if there is no error, this allows you to pass `this.onerror` to node-style callbacks.
    if (isNil(err)) {
      return;
    }

    err = wrapInNativeError(err);

    // Client aborted errors are a 500 by default, but 499 is more appropriate
    if (err instanceof formidable.errors.FormidableError) {
      if (err.internalCode === 1002) {
        err = ClientClosedRequestError();
      }
    } else if (
      // The connection ended part way through the request message.
      err.code === "HPE_INVALID_EOF_STATE" ||
      // The client closed the connection before the response was sent.
      err.code === "ECONNRESET" ||
      // The client closed the connection while the response was written.
      err.code === "EPIPE" ||
      // Raised by the body parser when the request stream was already destroyed.
      err.type === "stream.not.readable"
    ) {
      err = ClientClosedRequestError();
    } else if (isQueryCanceledError(err)) {
      err = RequestTimeoutError();
    }

    // Push only errors explicitly marked for Sentry reporting.
    // For unknown errors without isReportable property, report them as well
    // to ensure we don't miss unexpected errors.
    const shouldReport =
      err.isReportable === true ||
      (err.isReportable !== false &&
        (typeof err.status !== "number" ||
          !http.STATUS_CODES[err.status] ||
          err.status === 500));

    // Errors raised by the application describe an expected condition, so their
    // status and message are safe to send even when they are also reported.
    const isKnownError =
      typeof err.id === "string" && err.id !== "internal_error";

    if (shouldReport) {
      requestErrorHandler(err, this);

      if (!isKnownError) {
        if (env.ENVIRONMENT === "test") {
          // oxlint-disable-next-line no-console
          console.error(err);
        }
        err = InternalError();
      }
    }

    const headerSent = this.headerSent || !this.writable;

    // Nothing we can do here other than delegate to the app-level handler and log.
    if (headerSent) {
      err.headerSent = true;

      // Nothing was written, so the status code is still Koa's placeholder 404 –
      // correct it so that logging and tracing report the real outcome.
      if (!this.headerSent && typeof err.status === "number") {
        this.res.statusCode = err.status;
      }

      return;
    }

    this.set(err.headers);
    this.status = err.status;
    this.type = this.accepts("json", "html") || "json";

    if (this.type === "text/html") {
      this.body = readErrorFile()
        .toString()
        .replace(/\/\/inject-message\/\//g, escape(err.message))
        .replace(/\/\/inject-status\/\//g, escape(err.status))
        .replace(/\/\/inject-stack\/\//g, escape(err.stack));
    } else {
      this.body = JSON.stringify({
        ok: false,
        error: snakeCase(err.id),
        status: Number(err.status),
        message: String(err.message || err.name),
        data: err.errorData ?? undefined,
      });
    }

    this.res.end(this.body);
  };

  return app;
}

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function wrapInNativeError(err: any): Error {
  // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
  // See https://github.com/koajs/koa/issues/1466
  const isNativeError =
    Object.prototype.toString.call(err) === "[object Error]" ||
    err instanceof Error;

  if (isNativeError) {
    return err as Error;
  }

  let errMsg = err;
  if (typeof err === "object") {
    try {
      errMsg = JSON.stringify(err);
      // oxlint-disable-next-line no-empty
    } catch (_err) {
      // Ignore
    }
  }
  const newError = InternalError(`Non-error thrown: ${errMsg}`);
  // err maybe an object, try to copy the name, message and stack to the new error instance
  if (err) {
    if (err.name) {
      newError.name = err.name;
    }
    if (err.message) {
      newError.message = err.message;
    }
    if (err.stack) {
      newError.stack = err.stack;
    }
    if (err.status) {
      newError.status = err.status;
    }
    if (err.headers) {
      newError.headers = err.headers;
    }
  }

  return newError;
}

function readErrorFile(): Buffer {
  if (env.isDevelopment) {
    return fs.readFileSync(path.join(__dirname, "error.dev.html"));
  }

  if (env.isProduction) {
    return (
      errorHtmlCache ??
      (errorHtmlCache = fs.readFileSync(
        path.join(__dirname, "error.prod.html")
      ))
    );
  }

  return (
    errorHtmlCache ??
    (errorHtmlCache = fs.readFileSync(
      path.join(__dirname, "static/error.dev.html")
    ))
  );
}
