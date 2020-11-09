// @flow
import debug from "debug";
import Sequelize from "sequelize";
import EncryptedField from "sequelize-encrypted";

const isProduction = process.env.NODE_ENV === "production";
const isSSLDisabled = process.env.PGSSLMODE === "disable";

export const encryptedFields = () =>
  EncryptedField(Sequelize, process.env.SECRET_KEY);

export const DataTypes = Sequelize;
export const Op = Sequelize.Op;

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: debug("sql"),
  typeValidation: true,
  dialectOptions: {
    ssl:
      isProduction && !isSSLDisabled
        ? {
            // Ref.: https://github.com/brianc/node-postgres/issues/2009
            rejectUnauthorized: false,
          }
        : false,
  },
});
