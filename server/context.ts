import type { Transaction } from "sequelize";
import type { User } from "@server/models";
import type { Authentication, Context } from "@server/types";
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
 * @returns the context.
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
  return {
    auth: { user, type: authType },
    ip: ip ?? user?.lastActiveIp,
    transaction,
  } as Context;
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
