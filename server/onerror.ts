import fs from "fs";
import http from "http";
import path from "path";
import Koa, { Context } from "koa";
import { isNil, escape } from "lodash";
import env from "@server/env";
import { InternalError } from "@server/errors";
import { requestErrorHandler } from "@server/logging/sentry";

const isDev = env.ENVIRONMENT === "development";
const isTest = env.ENVIRONMENT === "test";
let errorHtmlCache: Buffer | undefined;

const readErrorFile = (): Buffer => {
  if (!isTest) {
    return (
      errorHtmlCache ??
      (errorHtmlCache = fs.readFileSync(path.join(__dirname, "error.html")))
    );
  }

  return (
    errorHtmlCache ??
    (errorHtmlCache = fs.readFileSync(
      path.join(__dirname, "static/index.html")
    ))
  );
};

export default function onerror(app: Koa) {
  app.context.onerror = function (err: any) {
    // don't do anything if there is no error.
    // this allows you to pass `this.onerror`
    // to node-style callbacks.
    if (isNil(err)) {
      return;
    }

    // wrap non-error object
    if (!(err instanceof Error)) {
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

    // ENOENT support
    if (err.code === "ENOENT") {
      err.status = 404;
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

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
      return;
    }

    this.status = err.status;

    this.set(err.headers);
    const type = this.accepts("html", "json") || "json";
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
 * default json error handler
 * @param {Error} err
 */

function json(err: any, ctx: Context) {
  const message =
    (isDev || err.expose) && err.message
      ? err.message
      : http.STATUS_CODES[this.status];

  ctx.body = { error: message };
}

/**
 * default html error handler
 * @param {Error} err
 */

function html(err: any, ctx: Context) {
  const page = readErrorFile();
  ctx.body = page
    .toString()
    .replace(/\/\/inject-status\/\//g, escape(err.status))
    .replace(/\/\/inject-stack\/\//g, escape(err.stack));
  ctx.type = "html";
}
