import { parse } from "express-useragent";
import type { Next } from "koa";
import type { AppContext } from "@server/types";

/**
 * Middleware that makes the parsed `User-Agent` request header available as
 * `ctx.userAgent`.
 *
 * @returns The middleware function.
 */
export function userAgent() {
  return async function userAgentMiddleware(ctx: AppContext, next: Next) {
    ctx.userAgent = parse(ctx.header["user-agent"] ?? "unknown");

    return next();
  };
}
