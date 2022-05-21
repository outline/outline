import { Sequelize } from "sequelize-typescript";
import env from "@server/env";
import Logger from "../logging/Logger";
import * as models from "../models";

const isProduction = env.ENVIRONMENT === "production";
const isSSLDisabled = env.PGSSLMODE === "disable";
const poolMax = env.DATABASE_CONNECTION_POOL_MAX ?? 5;
const poolMin = env.DATABASE_CONNECTION_POOL_MIN ?? 0;

export const sequelize = new Sequelize(
  env.DATABASE_URL ?? env.DATABASE_CONNECTION_POOL_URL ?? "",
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
