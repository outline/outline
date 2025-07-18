import { Next } from "koa";
import { Transaction, DatabaseError } from "sequelize";
import { sequelize } from "@server/storage/database";
import { AppContext } from "@server/types";
import { sleep } from "@server/utils/timers";

/**
 * Check if an error is a deadlock error
 */
function isDeadlockError(error: any): boolean {
  return (
    error instanceof DatabaseError &&
    error.message.includes("deadlock detected")
  );
}

/**
 * Middleware that wraps a route in a database transaction, useful for mutations
 * The transaction is available on the context as `ctx.state.transaction` and
 * should be passed to all database calls within the route.
 *
 * Includes retry logic for deadlock detection with exponential backoff.
 *
 * @returns The middleware function.
 */
export function transaction() {
  return async function transactionMiddleware(ctx: AppContext, next: Next) {
    const maxRetries = 3;
    const baseDelay = 100; // Base delay in milliseconds

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await sequelize.transaction(async (t: Transaction) => {
          ctx.state.transaction = t;
          return next();
        });
        return;
      } catch (error) {
        if (isDeadlockError(error) && attempt < maxRetries) {
          // Wait before retrying with exponential backoff
          await sleep(baseDelay * Math.pow(2, attempt));
          continue;
        }

        // If it's not a deadlock error or we've exhausted retries, re-throw
        throw error;
      }
    }
  };
}
