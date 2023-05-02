import path from "path";
import { Sequelize } from "sequelize-typescript";
import { Umzug, SequelizeStorage } from "umzug";
import env from "@server/env";
import Logger from "../logging/Logger";
import * as models from "../models";

const isProduction = env.ENVIRONMENT === "production";
const isSSLDisabled = env.PGSSLMODE === "disable";
const poolMax = env.DATABASE_CONNECTION_POOL_MAX ?? 5;
const poolMin = env.DATABASE_CONNECTION_POOL_MIN ?? 0;
const url =
  env.DATABASE_CONNECTION_POOL_URL ||
  env.DATABASE_URL ||
  "postgres://localhost:5432/outline";

export const sequelize = new Sequelize(url, {
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
});

export const migrations = new Umzug({
  migrations: {
    glob: ["migrations/*.js", { cwd: path.resolve("server") }],
    resolve: ({ name, path, context }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const migration = require(path as string);
      return {
        name,
        up: async () => migration.up(context, Sequelize),
        down: async () => migration.down(context, Sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: {
    warn: (msg) => Logger.warn("database", msg),
    error: (msg) =>
      Logger.error(JSON.stringify(msg), new Error("Database migration failed")),
    info: (msg) => Logger.info("database", JSON.stringify(msg)),
    debug: (msg) => Logger.debug("database", JSON.stringify(msg)),
  },
});
