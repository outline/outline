import { Transaction } from "sequelize";
import { User } from "@server/models";
import { APIContext, AuthenticationType } from "@server/types";

export function createContext({
  user,
  authType = AuthenticationType.APP,
  ip,
  transaction,
}: {
  user: User;
  authType?: AuthenticationType | null;
  ip?: string | null;
  transaction?: Transaction;
}) {
  return {
    context: {
      auth: { user, type: authType },
      ip: ip ?? user.lastActiveIp,
      transaction,
    },
  } as APIContext;
}
