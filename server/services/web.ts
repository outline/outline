import crypto from "crypto";
import { Server } from "https";
import Koa from "koa";
import koaHelmet from "koa-helmet";
import mount from "koa-mount";
import enforceHttps, {
  httpsResolver,
  xForwardedProtoResolver,
} from "koa-sslify";
import { Second } from "@shared/utils/time";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";
import { initI18n } from "@server/utils/i18n";
import routes from "../routes";
import api from "../routes/api";
import auth from "../routes/auth";

const securityHeaders: Record<string, string[]> = {
  "Content-Security-Policy": [
    `default-src ${env.isProduction ? "'self'" : "*"}`,
    `style-src ${env.isProduction ? "'self'" : "'unsafe-inline'"} ${
      env.CDN_URL ?? ""
    }`,
    `script-src ${env.isProduction ? "'self'" : "'unsafe-inline'"} ${
      env.DEVELOPMENT_UNSAFE_INLINE_CSP ? "'unsafe-inline'" : `'nonce-${ctx.state.cspNonce}'`
    } ${env.GOOGLE_ANALYTICS_ID ? "www.google-analytics.com" : ""} ${
      env.CDN_URL ?? ""
    }`,
    "media-src * data: blob:",
    "img-src * data: blob:",
    "frame-src * data:",
    "connect-src *",
  ],
  "DNS-Prefetch-Control": ["on"],
  Referrer-Policy: ["no-referrer"],
};

if (env.isProduction && env.FORCE_HTTPS) {
  securityHeaders["Strict-Transport-Security"] = ["max-age=31536000; includeSubDomains; preload"];
}

export default function init(app: Koa = new Koa(), server?: Server) {
  void initI18n();

  if (env.isProduction) {
    // Force redirect to HTTPS protocol unless explicitly disabled
    if (env.FORCE_HTTPS) {
      app.use(
        enforceHttps({
          resolver: (ctx) => {
            if (httpsResolver(ctx)) {
              return true;
            }
            return xForwardedProtoResolver(ctx);
          },
        })
      );
    } else {
      Logger.warn("Enforced https was disabled with FORCE_HTTPS env variable");
    }

    // trust header fields set by our proxy. eg X-Forwarded-For
    app.proxy = true;
  }

  app.use(mount("/auth", auth));
  app.use(mount("/api", api));

  // Monitor server connections
  if (server) {
    setInterval(() => {
      server.getConnections((err, count) => {
        if (err) {
          return;
        }
        Metrics.gaugePerInstance("connections.count", count);
      });
    }, 5 * Second);
  }

  ShutdownHelper.add("connections", ShutdownOrder.normal, async () => {
    Metrics.gaugePerInstance("connections.count", 0);
  });

  // Sets common security headers by default, such as no-sniff, hsts, hide powered
  // by etc, these are applied after auth and api so they are only returned on
  // standard non-XHR accessed routes
  app.use(koaHelmet(securityHeaders));

  app.use(mount(routes));

  return app;
}
