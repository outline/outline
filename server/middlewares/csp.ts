import crypto from "crypto";
import { Context, Next } from "koa";
import { contentSecurityPolicy } from "koa-helmet";
import env from "@server/env";

export default function createCSPMiddleware() {
  // Construct scripts CSP based on services in use by this installation
  const defaultSrc = ["'self'"];
  const scriptSrc = ["'self'", "www.googletagmanager.com"];
  const styleSrc = ["'self'", "'unsafe-inline'"];

  if (env.isCloudHosted) {
    scriptSrc.push("cdn.zapier.com");
    styleSrc.push("cdn.zapier.com");
  }

  // Allow to load assets from Vite
  if (!env.isProduction) {
    scriptSrc.push(env.URL.replace(`:${env.PORT}`, ":3001"));
    scriptSrc.push("localhost:3001");
  }

  if (env.GOOGLE_ANALYTICS_ID) {
    scriptSrc.push("www.google-analytics.com");
  }

  if (env.CDN_URL) {
    scriptSrc.push(env.CDN_URL);
    styleSrc.push(env.CDN_URL);
    defaultSrc.push(env.CDN_URL);
  }

  return function cspMiddleware(ctx: Context, next: Next) {
    ctx.state.cspNonce = crypto.randomBytes(16).toString("hex");

    return contentSecurityPolicy({
      directives: {
        defaultSrc,
        styleSrc,
        scriptSrc: [
          ...scriptSrc,
          env.DEVELOPMENT_UNSAFE_INLINE_CSP
            ? "'unsafe-inline'"
            : `'nonce-${ctx.state.cspNonce}'`,
        ],
        mediaSrc: ["*", "data:", "blob:"],
        imgSrc: ["*", "data:", "blob:"],
        frameSrc: ["*", "data:"],
        // Do not use connect-src: because self + websockets does not work in
        // Safari, ref: https://bugs.webkit.org/show_bug.cgi?id=201591
        connectSrc: ["*"],
      },
    })(ctx, next);
  };
}
