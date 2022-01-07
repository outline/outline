import SequelizeEncrypted from "sequelize-encrypted";
import { Sequelize } from "sequelize-typescript";

/**
 * Encrypted field storage, use via the Encrypted decorator, not directly.
 */
export default function vaults() {
  return SequelizeEncrypted(Sequelize, process.env.SECRET_KEY);
}
