import type { Transaction } from "sequelize";
import type { User } from "@server/models";
import type { APIContext } from "@server/types";
import { AuthenticationType } from "@server/types";

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
