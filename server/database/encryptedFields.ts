import EncryptedField from "sequelize-encrypted";
import { Sequelize } from "sequelize-typescript";

export default function encryptedFields() {
  return EncryptedField(Sequelize, process.env.SECRET_KEY);
}
