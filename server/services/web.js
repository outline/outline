// @flow
import http from "http";
import Koa from "koa";
import {
  contentSecurityPolicy,
  dnsPrefetchControl,
  referrerPolicy,
} from "koa-helmet";
import mount from "koa-mount";
import onerror from "koa-onerror";
import enforceHttps from "koa-sslify";
import api from "../api";
import auth from "../auth";
import emails from "../emails";
import env from "../env";
import routes from "../routes";
import Sentry from "../sentry";

const isProduction = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";

// Construct scripts CSP based on services in use by this installation
const defaultSrc = ["'self'"];
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "gist.github.com",
];

if (env.GOOGLE_ANALYTICS_ID) {
  scriptSrc.push("www.google-analytics.com");
}
if (env.CDN_URL) {
  scriptSrc.push(env.CDN_URL);
  defaultSrc.push(env.CDN_URL);
}

export default function init(app: Koa, server: http.Server) {
  if (isProduction) {
    // Force redirect to HTTPS protocol unless explicitly disabled
    if (process.env.FORCE_HTTPS !== "false") {
      app.use(
        enforceHttps({
          trustProtoHeader: true,
        })
      );
    } else {
      console.warn("Enforced https was disabled with FORCE_HTTPS env variable");
    }

    // trust header fields set by our proxy. eg X-Forwarded-For
    app.proxy = true;
  } else if (!isTest) {
    /* eslint-disable global-require */
    const convert = require("koa-convert");
    const webpack = require("webpack");
    const devMiddleware = require("koa-webpack-dev-middleware");
    const hotMiddleware = require("koa-webpack-hot-middleware");
    const config = require("../../webpack.config.dev");
    const compile = webpack(config);
    /* eslint-enable global-require */

    const middleware = devMiddleware(compile, {
      // display no info to console (only warnings and errors)
      noInfo: true,

      // display nothing to the console
      quiet: false,

      watchOptions: {
        poll: 1000,
        ignored: ["node_modules", "flow-typed", "server", "build", "__mocks__"],
      },

      // public path to bind the middleware to
      // use the same as in webpack
      publicPath: config.output.publicPath,

      // options for formatting the statistics
      stats: {
        colors: true,
      },
    });

    app.use(async (ctx, next) => {
      ctx.webpackConfig = config;
      ctx.devMiddleware = middleware;
      await next();
    });
    app.use(convert(middleware));
    app.use(
      convert(
        hotMiddleware(compile, {
            log: console.log, // eslint-disable-line
          path: "/__webpack_hmr",
          heartbeat: 10 * 1000,
        })
      )
    );
    app.use(mount("/emails", emails));
  }

  // catch errors in one place, automatically set status and response headers
  onerror(app);

  app.on("error", (error, ctx) => {
    // we don't need to report every time a request stops to the bug tracker
    if (error.code === "EPIPE" || error.code === "ECONNRESET") {
      console.warn("Connection error", { error });
      return;
    }

    if (process.env.SENTRY_DSN) {
      Sentry.withScope(function (scope) {
        const requestId = ctx.headers["x-request-id"];
        if (requestId) {
          scope.setTag("request_id", requestId);
        }

        const authType = ctx.state ? ctx.state.authType : undefined;
        if (authType) {
          scope.setTag("auth_type", authType);
        }

        const userId =
          ctx.state && ctx.state.user ? ctx.state.user.id : undefined;
        if (userId) {
          scope.setUser({ id: userId });
        }

        scope.addEventProcessor(function (event) {
          return Sentry.Handlers.parseRequest(event, ctx.request);
        });
        Sentry.captureException(error);
      });
    } else {
      console.error(error);
    }
  });

  app.use(mount("/auth", auth));
  app.use(mount("/api", api));

  // Sets common security headers by default, such as no-sniff, hsts, hide powered
  // by etc, these are applied after auth and api so they are only returned on
  // standard non-XHR accessed routes
  app.use(async (ctx, next) => {
    ctx.set("Permissions-Policy", "interest-cohort=()");
    await next();
  });
  app.use(
    contentSecurityPolicy({
      directives: {
        defaultSrc,
        scriptSrc,
        styleSrc: ["'self'", "'unsafe-inline'", "github.githubassets.com"],
        imgSrc: ["*", "data:", "blob:"],
        frameSrc: ["*"],
        connectSrc: ["*"],
        // Do not use connect-src: because self + websockets does not work in
        // Safari, ref: https://bugs.webkit.org/show_bug.cgi?id=201591
      },
    })
  );

  // Allow DNS prefetching for performance, we do not care about leaking requests
  // to our own CDN's
  app.use(dnsPrefetchControl({ allow: true }));
  app.use(referrerPolicy({ policy: "no-referrer" }));
  app.use(mount(routes));
}
