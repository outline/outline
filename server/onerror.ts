import fs from "fs";
import http from "http";
import path from "path";
import Koa, { Context } from "koa";
import escape from "lodash/escape";
import isNil from "lodash/isNil";
import snakeCase from "lodash/snakeCase";
import { ValidationError, EmptyResultError } from "sequelize";
import env from "@server/env";
import { InternalError } from "@server/errors";
import { requestErrorHandler } from "@server/logging/sentry";

const isDev = env.ENVIRONMENT === "development";
const isProd = env.ENVIRONMENT === "production";
let errorHtmlCache: Buffer | undefined;

const readErrorFile = (): Buffer => {
  if (isDev) {
    return fs.readFileSync(path.join(__dirname, "error.dev.html"));
  }

  if (isProd) {
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
};

export default function onerror(app: Koa) {
  app.context.onerror = function (err: any) {
    // Don't do anything if there is no error, this allows you to pass `this.onerror` to node-style callbacks.
    if (isNil(err)) {
      return;
    }

    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError =
      Object.prototype.toString.call(err) === "[object Error]" ||
      err instanceof Error;

    // wrap non-error object
    if (!isNativeError) {
      let errMsg = err;
      if (typeof err === "object") {
        try {
          errMsg = JSON.stringify(err);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
      const newError = InternalError(`non-error thrown: ${errMsg}`);
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
      err = newError;
    }

    if (err instanceof ValidationError) {
      // @ts-expect-error status is not a property on ValidationError
      err.status = 400;

      if (err.errors && err.errors[0]) {
        err.message = `${err.errors[0].message} (${err.errors[0].path})`;
      }
    }

    if (
      err.code === "ENOENT" ||
      err instanceof EmptyResultError ||
      /Not found/i.test(err.message)
    ) {
      err.status = 404;
    }

    if (/Authorization error/i.test(err.message)) {
      err.status = 403;
    }

    if (typeof err.status !== "number" || !http.STATUS_CODES[err.status]) {
      err.status = 500;
    }

    // Push only unknown 500 errors to sentry
    if (err.status === 500) {
      requestErrorHandler(err, this);
    }

    const headerSent = this.headerSent || !this.writable;
    if (headerSent) {
      err.headerSent = true;
    }

    // Nothing we can do here other than delegate to the app-level handler and log.
    if (headerSent) {
      return;
    }

    this.status = err.status;

    this.set(err.headers);
    const type = this.accepts("json", "html") || "json";
    if (type === "html") {
      html.call(this, err, this);
    } else {
      json.call(this, err, this);
    }
    this.type = type;

    if (type === "json") {
      this.body = JSON.stringify(this.body);
    }
    this.res.end(this.body);
  };

  return app;
}

/**
 * Handle errors for json requests.
 *
 * @param err The error being handled.
 * @param ctx The request context.
 */

function json(err: any, ctx: Context) {
  ctx.status = err.status;
  let message;
  let id;

  if (ctx.status === 400) {
    message = "Validation error";
    id = "validation_error";
  }
  if (ctx.status === 401) {
    message = "Authentication error";
    id = "authentication_error";
  }
  if (ctx.status === 403) {
    message = "Authorization error";
    id = "authorization_error";
  }
  if (ctx.status === 404) {
    message = "Resource not found";
    id = "not_found";
  }
  if (ctx.status === 500) {
    message = "Internal server error";
    id = "internal_server_error";
  }

  ctx.body = {
    ok: false,
    error: snakeCase(err.id || id),
    status: ctx.status,
    message: err.message || message || err.name,
    data: err.errorData ?? undefined,
  };
}

/**
 * Handle errors for html requests.
 *
 * @param err The error being handled.
 * @param ctx The request context.
 */

function html(err: any, ctx: Context) {
  const page = readErrorFile();
  ctx.body = page
    .toString()
    .replace(/\/\/inject-message\/\//g, escape(err.message))
    .replace(/\/\/inject-status\/\//g, escape(err.status))
    .replace(/\/\/inject-stack\/\//g, escape(err.stack));
  ctx.type = "html";
}
