import { Next } from "koa";
import { Transaction } from "sequelize";
import { sequelize } from "@server/storage/database";
import { AppContext } from "@server/types";

/**
 * Middleware that wraps a route in a database transaction, useful for mutations
 * The transaction is available on the context as `ctx.state.transaction` and
 * should be passed to all database calls within the route.
 *
 * @returns The middleware function.
 */
export function transaction() {
  return async function transactionMiddleware(ctx: AppContext, next: Next) {
    await sequelize.transaction(async (t: Transaction) => {
      ctx.state.transaction = t;
      return next();
    });
  };
}
