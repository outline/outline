import SequelizeEncrypted from "sequelize-encrypted";
import { Sequelize } from "sequelize-typescript";
import env from "@server/env";

/**
 * Encrypted field storage, use via the Encrypted decorator, not directly.
 */
export default function vaults() {
  return SequelizeEncrypted(Sequelize, env.SECRET_KEY);
}
