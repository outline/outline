import type { Next } from "koa";
import type { AppContext } from "@server/types";
import { requestContext } from "@server/storage/requestContext";

/**
 * Middleware that wraps the request in an AsyncLocalStorage context, making the
 * current request available to Sequelize hooks so that queries can be
 * short-circuited when the socket has been destroyed (e.g. after a timeout).
 *
 * @returns The middleware function.
 */
export default function requestContextMiddleware() {
  return (ctx: AppContext, next: Next) =>
    requestContext.run({ req: ctx.req }, next);
}
