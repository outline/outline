import type { Transaction } from "sequelize";
import type { User } from "@server/models";
import type { APIContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { sequelize } from "./storage/database";

/**
 * Factory to create a new API context.
 */
export function createContext({
  user,
  authType = AuthenticationType.APP,
  ip,
  transaction,
}: {
  user?: User;
  authType?: AuthenticationType | null;
  ip?: string | null;
  transaction?: Transaction;
}) {
  const auth = { user, type: authType };
  return {
    state: {
      auth,
      transaction,
    },
    context: {
      auth,
      ip: ip ?? user?.lastActiveIp,
      transaction,
    },
  } as APIContext;
}

/**
 * Utility to ensure a transaction is available in the context.
 * If the context already has a transaction, it will use that one instead.
 */
export function withTransactionContext<T>(
  ctx: APIContext,
  callback: (ctx: APIContext) => Promise<T>
): Promise<T> {
  if (ctx.state.transaction) {
    return callback(ctx);
  }

  return sequelize.transaction(async (transaction) =>
    callback(createContext({ ...ctx.context, transaction }))
  );
}
