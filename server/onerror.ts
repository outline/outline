import fs from "fs";
import http from "http";
import path from "path";
import formidable from "formidable";
import Koa from "koa";
import escape from "lodash/escape";
import isNil from "lodash/isNil";
import snakeCase from "lodash/snakeCase";
import env from "@server/env";
import { ClientClosedRequestError, InternalError } from "@server/errors";
import { requestErrorHandler } from "@server/logging/sentry";

let errorHtmlCache: Buffer | undefined;

export default function onerror(app: Koa) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.context.onerror = function (err: any) {
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
    }

    // Push only unknown and 500 status errors to sentry
    if (
      typeof err.status !== "number" ||
      !http.STATUS_CODES[err.status] ||
      err.status === 500
    ) {
      requestErrorHandler(err, this);

      if (!(err instanceof InternalError)) {
        if (env.ENVIRONMENT === "test") {
          // eslint-disable-next-line no-console
          console.error(err);
        }
        err = InternalError();
      }
    }

    const headerSent = this.headerSent || !this.writable;
    if (headerSent) {
      err.headerSent = true;
    }

    // Nothing we can do here other than delegate to the app-level handler and log.
    if (headerSent) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapInNativeError(err: any): Error {
  // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
  // See https://github.com/koajs/koa/issues/1466
  // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
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
      // eslint-disable-next-line no-empty
    } catch (e) {}
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
