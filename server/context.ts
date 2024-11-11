import { Transaction } from "sequelize";
import { User } from "@server/models";
import { APIContext } from "@server/types";

export function createContext(
  user: User,
  transaction?: Transaction,
  ip?: string
) {
  return {
    context: {
      ip: ip ?? user.lastActiveIp,
      transaction,
      auth: { user },
    },
  } as APIContext;
}
