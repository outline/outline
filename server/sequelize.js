// @flow
import Sequelize from "sequelize";
import EncryptedField from "sequelize-encrypted";
import Logger from "./logging/logger";

const isProduction = process.env.NODE_ENV === "production";
const isSSLDisabled = process.env.PGSSLMODE === "disable";

export const encryptedFields = () =>
  EncryptedField(Sequelize, process.env.SECRET_KEY);

export const DataTypes = Sequelize;
export const Op = Sequelize.Op;

export const sequelize = new Sequelize(
  process.env.DATABASE_URL || process.env.DATABASE_CONNECTION_POOL_URL,
  {
    logging: (msg) => Logger.debug("database", msg),
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
  }
);
