import type { Transaction } from "sequelize";
import type { Integration, User } from "@server/models";
import type { AppContext, Authentication, Context } from "@server/types";
import { AuthenticationType } from "@server/types";

/** The fields of a context that model hooks read from query options. */
export interface HookContextFields {
  /** The authentication for the actor performing the mutation. */
  auth: Authentication;
  /** The transaction the mutation runs in. */
  transaction?: Transaction;
  /** The IP address of the actor. */
  ip?: string;
}

/**
 * Factory to create a new context.
 *
 * @param options.user the actor for the context.
 * @param options.authType the type of authentication used by the actor.
 * @param options.ip the IP address of the actor, defaults to the last active IP.
 * @param options.transaction the transaction for database mutations.
 * @param options.integration the integration that the request came through.
 * @returns the context.
 */
export function createContext({
  user,
  authType = AuthenticationType.APP,
  ip,
  transaction,
  integration,
}: {
  user?: User;
  authType?: AuthenticationType | null;
  ip?: string | null;
  transaction?: Transaction;
  integration?: Integration;
}) {
  return {
    auth: { user, type: authType },
    ip: ip ?? user?.lastActiveIp,
    transaction,
    state: { integration },
  } as Context;
}

/**
 * Derives a context from an existing one that acts as the given user.
 *
 * @param ctx the context to derive from.
 * @param user the actor for the new context.
 * @returns the derived context.
 */
export function withUser(ctx: AppContext | Context, user?: User) {
  return createContext({
    user,
    authType: ctx.auth?.type,
    ip: ctx.ip,
    transaction: ctx.transaction,
  });
}

/**
 * Derives a context from an existing one that runs in the given transaction.
 *
 * @param ctx the context to derive from.
 * @param transaction the transaction for the new context.
 * @returns the derived context.
 */
export function withTransaction(ctx: Context, transaction: Transaction) {
  return { auth: ctx.auth, ip: ctx.ip, transaction } as Context;
}

/**
 * Extracts the fields that model hooks read from a context, for use as query options.
 *
 * @param ctx the context to read from.
 * @returns the hook context fields.
 */
export function toHookContext(ctx: Context): HookContextFields {
  return {
    auth: ctx.auth,
    transaction: ctx.transaction,
    ip: ctx.ip,
  };
}
