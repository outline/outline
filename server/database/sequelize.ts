import { Sequelize } from "sequelize-typescript";
import Logger from "../logging/logger";
import * as models from "../models";

const isProduction = process.env.NODE_ENV === "production";
const isSSLDisabled = process.env.PGSSLMODE === "disable";
const poolMax = parseInt(process.env.DATABASE_CONNECTION_POOL_MAX || "5", 10);
const poolMin = parseInt(process.env.DATABASE_CONNECTION_POOL_MIN || "0", 10);

export const sequelize = new Sequelize(
  process.env.DATABASE_URL || process.env.DATABASE_CONNECTION_POOL_URL || "",
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
    models: Object.values(models),
    pool: {
      max: poolMax,
      min: poolMin,
      acquire: 30000,
      idle: 10000,
    },
  }
);
