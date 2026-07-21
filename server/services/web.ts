/* oxlint-disable @typescript-eslint/no-var-requires */
import type { Server } from "node:https";
import type { BaseContext } from "koa";
import Koa from "koa";
import compress from "koa-compress";
import { dnsPrefetchControl, referrerPolicy } from "koa-helmet";
import mount from "koa-mount";
import enforceHttps, {
  httpsResolver,
  xForwardedProtoResolver,
} from "koa-sslify";
import { Second } from "@shared/utils/time";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import csp from "@server/middlewares/csp";
import { attachCSRFToken } from "@server/middlewares/csrf";
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";
import { initI18n } from "@server/utils/i18n";
import routes from "../routes";
import api from "../routes/api";
import auth from "../routes/auth";
import mcp from "../routes/mcp";
import oauth from "../routes/oauth";
import type { UserAgentContext } from "koa-useragent";
import userAgent from "koa-useragent";

export default function init(app: Koa = new Koa(), server?: Server) {
  void initI18n();

  if (env.isProduction) {
    // Trust the X-Forwarded-* headers set by an upstream proxy, eg
    // X-Forwarded-For. Defaults to true, but can be disabled with
    // PROXY_HEADERS_TRUSTED when the app is reachable directly.
    if (env.PROXY_HEADERS_TRUSTED) {
      app.proxy = true;
      if (env.PROXY_IP_HEADER) {
        app.proxyIpHeader = env.PROXY_IP_HEADER;
      }
    }

    // Force redirect to HTTPS protocol unless explicitly disabled
    if (env.FORCE_HTTPS) {
      app.use(
        enforceHttps({
          resolver: (ctx) => {
            if (httpsResolver(ctx)) {
              return true;
            }
            // Only honor X-Forwarded-Proto when proxy headers are trusted
            return env.PROXY_HEADERS_TRUSTED
              ? xForwardedProtoResolver(ctx)
              : false;
          },
        })
      );
    } else {
      Logger.warn("Enforced https was disabled with FORCE_HTTPS env variable");
    }
  }

  // Make `ctx.userAgent` available
  app.use<BaseContext, UserAgentContext>(userAgent);

  app.use(compress());

  // Monitor server connections
  if (server) {
    setInterval(() => {
      server.getConnections((err, count) => {
        if (err) {
          return;
        }
        Metrics.gaugePerInstance("connections.count", count);
      });
    }, 5 * Second.ms).unref();
  }

  ShutdownHelper.add("connections", ShutdownOrder.normal, async () => {
    Metrics.gaugePerInstance("connections.count", 0);
  });

  app.use(mount("/api", api));
  app.use(mount("/mcp", mcp));

  // Generate and attach a CSRF token to the session on non-API requests
  app.use(attachCSRFToken());

  // Apply CSP middleware after API as these responses are rendered in the browser
  app.use(csp());

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

  app.use(mount("/auth", auth));
  app.use(mount("/oauth", oauth));
  app.use(mount(routes));

  return app;
}
