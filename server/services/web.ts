/* eslint-disable @typescript-eslint/no-var-requires */
import { Server } from "https";
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
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";
import { initI18n } from "@server/utils/i18n";
import routes from "../routes";
import api from "../routes/api";
import auth from "../routes/auth";
import oauth from "../routes/oauth";

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
    }, 5 * Second.ms);
  }

  ShutdownHelper.add("connections", ShutdownOrder.normal, async () => {
    Metrics.gaugePerInstance("connections.count", 0);
  });

  app.use(mount("/api", api));

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

  app.use(mount("/oauth", oauth));
  app.use(mount("/auth", auth));
  app.use(mount(routes));

  return app;
}
