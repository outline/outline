// @flow
import debug from "debug";
import Sequelize from "sequelize";
import EncryptedField from "sequelize-encrypted";

export const encryptedFields = EncryptedField(
  Sequelize,
  process.env.SECRET_KEY
);

export const DataTypes = Sequelize;
export const Op = Sequelize.Op;

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  // logging: console.log,
  logging: debug("sql"),
  typeValidation: true,
});
