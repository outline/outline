/* eslint-disable @typescript-eslint/no-var-requires */
import Koa from "koa";
import {
  contentSecurityPolicy,
  dnsPrefetchControl,
  referrerPolicy,
} from "koa-helmet";
import mount from "koa-mount";
import enforceHttps from "koa-sslify";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import routes from "../routes";
import api from "../routes/api";
import auth from "../routes/auth";

const isProduction = env.ENVIRONMENT === "production";
const isTest = env.ENVIRONMENT === "test";

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

export default function init(app: Koa = new Koa()): Koa {
  if (isProduction) {
    // Force redirect to HTTPS protocol unless explicitly disabled
    if (env.FORCE_HTTPS) {
      app.use(
        enforceHttps({
          // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ trustProtoHeader: boolean; }' ... Remove this comment to see the full error message
          trustProtoHeader: true,
        })
      );
    } else {
      Logger.warn("Enforced https was disabled with FORCE_HTTPS env variable");
    }

    // trust header fields set by our proxy. eg X-Forwarded-For
    app.proxy = true;
  } else if (!isTest) {
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
          // @ts-expect-error ts-migrate(7019) FIXME: Rest parameter 'args' implicitly has an 'any[]' ty... Remove this comment to see the full error message
          log: (...args) => Logger.info("lifecycle", ...args),
          path: "/__webpack_hmr",
          heartbeat: 10 * 1000,
        })
      )
    );
  }

  app.use(mount("/auth", auth));
  app.use(mount("/api", api));
  // Sets common security headers by default, such as no-sniff, hsts, hide powered
  // by etc, these are applied after auth and api so they are only returned on
  // standard non-XHR accessed routes
  app.use(
    contentSecurityPolicy({
      directives: {
        defaultSrc,
        scriptSrc,
        styleSrc: ["'self'", "'unsafe-inline'", "github.githubassets.com"],
        imgSrc: ["*", "data:", "blob:"],
        frameSrc: ["*", "data:"],
        connectSrc: ["*"], // Do not use connect-src: because self + websockets does not work in
        // Safari, ref: https://bugs.webkit.org/show_bug.cgi?id=201591
      },
    })
  );
  // Allow DNS prefetching for performance, we do not care about leaking requests
  // to our own CDN's
  app.use(
    dnsPrefetchControl({
      allow: true,
    })
  );
  app.use(
    referrerPolicy({
      policy: "no-referrer",
    })
  );
  app.use(mount(routes));
  return app;
}
