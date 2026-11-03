import type { Next } from "koa";
import type { AppContext } from "@server/types";

/**
 * Ensures the request body is always an object, koa-body leaves it undefined
 * for requests with an unrecognized content type.
 *
 * @returns the middleware.
 */
export default function coalesceBody() {
  return function coalesceBodyMiddleware(ctx: AppContext, next: Next) {
    if (!ctx.request.body) {
      ctx.request.body = {};
    }
    return next();
  };
}
