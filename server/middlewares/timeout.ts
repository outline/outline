import type { Next } from "koa";
import type { AppContext } from "@server/types";

/**
 * Middleware to extend the request timeout for specific routes.
 *
 * @param timeoutMs The timeout in milliseconds.
 * @returns The middleware function.
 */
export default function timeout(timeoutMs: number) {
  return async function timeoutMiddleware(ctx: AppContext, next: Next) {
    // Store the original timeout so we can restore it later
    const originalTimeout = ctx.req.socket.timeout || 0;

    // Set the new timeout on the socket
    ctx.req.socket.setTimeout(timeoutMs);

    try {
      await next();
    } finally {
      // Restore the original timeout after the request completes
      ctx.req.socket.setTimeout(originalTimeout);
    }
  };
}
