import type { Transaction } from "sequelize";
import type { Integration, User } from "@server/models";
import type { APIContext } from "@server/types";
import { AuthenticationType } from "@server/types";

/**
 * Factory to create a new API context.
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
  const auth = { user, type: authType };
  return {
    state: {
      auth,
      transaction,
      integration,
    },
    context: {
      auth,
      ip: ip ?? user?.lastActiveIp,
      transaction,
    },
  } as APIContext;
}
