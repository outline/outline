import type { Next } from "koa";
import type { AppContext } from "@server/types";

/**
 * Middleware that defines the `ctx.context` getter, which provides the current
 * request's auth, transaction, and IP to database mutation helpers like
 * `saveWithCtx` and `destroyWithCtx`.
 *
 * @returns The middleware function.
 */
export function apiContext() {
  return async function apiContextMiddleware(ctx: AppContext, next: Next) {
    Object.defineProperty(ctx, "context", {
      configurable: true,
      get() {
        return {
          auth: ctx.state.auth,
          transaction: ctx.state.transaction,
          ip: ctx.request.ip,
        };
      },
    });

    return next();
  };
}
