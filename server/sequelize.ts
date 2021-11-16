import Sequelize from "sequelize";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'sequ... Remove this comment to see the full error message
import EncryptedField from "sequelize-encrypted";
import Logger from "./logging/logger";

const isProduction = process.env.NODE_ENV === "production";
const isSSLDisabled = process.env.PGSSLMODE === "disable";

export const encryptedFields = () =>
  EncryptedField(Sequelize, process.env.SECRET_KEY);

export const DataTypes = Sequelize;

export const Op = Sequelize.Op;

// @ts-expect-error ts-migrate(2351) FIXME: This expression is not constructable.
export const sequelize = new Sequelize(
  process.env.DATABASE_URL || process.env.DATABASE_CONNECTION_POOL_URL,
  {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'msg' implicitly has an 'any' type.
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
