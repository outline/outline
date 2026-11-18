import type { Context, Next } from "koa";
import env from "@server/env";

/**
 * Middleware that sets the response headers that are needed when serving the
 * web application.
 *
 * @returns the middleware function.
 */
export default function appHeaders() {
  // Sentry needs this header to report all performance metrics, see:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Timing-Allow-Origin
  const timingOrigins = [env.URL];

  if (env.SENTRY_DSN) {
    timingOrigins.push("https://sentry.io");
  }

  const timingAllowOrigin = timingOrigins.join(", ");

  return async function appHeadersMiddleware(ctx: Context, next: Next) {
    ctx.set("Timing-Allow-Origin", timingAllowOrigin);

    // Allow the JS Self-Profiling API to be used for local performance work.
    if (env.isDevelopment) {
      ctx.set("Document-Policy", "js-profiling");
    }

    await next();
  };
}
