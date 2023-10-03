import path from "path";
import { Sequelize } from "sequelize-typescript";
import { Umzug, SequelizeStorage, MigrationError } from "umzug";
import env from "@server/env";
import Logger from "../logging/Logger";
import * as models from "../models";

const isDevelopment = env.ENVIRONMENT === "development";
const isProduction = env.ENVIRONMENT === "production";
const isSSLDisabled = env.PGSSLMODE === "disable";
const poolMax = env.DATABASE_CONNECTION_POOL_MAX ?? 5;
const poolMin = env.DATABASE_CONNECTION_POOL_MIN ?? 0;
const url =
  env.DATABASE_CONNECTION_POOL_URL ||
  env.DATABASE_URL ||
  "postgres://localhost:5432/outline";

export const sequelize = new Sequelize(url, {
  logging: (msg) =>
    process.env.DEBUG?.includes("database") && Logger.debug("database", msg),
  typeValidation: true,
  logQueryParameters: isDevelopment,
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

/**
 * This function is used to test the database connection on startup. It will
 * throw a descriptive error if the connection fails.
 */
export const checkConnection = async () => {
  try {
    await sequelize.authenticate();
  } catch (error) {
    if (error.message.includes("does not support SSL")) {
      Logger.fatal(
        "The database does not support SSL connections. Set the `PGSSLMODE` environment variable to `disable` or enable SSL on your database server.",
        error
      );
    } else {
      Logger.fatal("Failed to connect to database", error);
    }
  }
};

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
    warn: (params) => Logger.warn("database", params),
    error: (params: Record<string, unknown> & MigrationError) =>
      Logger.error(params.message, params),
    info: (params) =>
      Logger.info(
        "database",
        params.event === "migrating"
          ? `Migrating ${params.name}…`
          : `Migrated ${params.name} in ${params.durationSeconds}s`
      ),
    debug: (params) =>
      Logger.debug(
        "database",
        params.event === "migrating"
          ? `Migrating ${params.name}…`
          : `Migrated ${params.name} in ${params.durationSeconds}s`
      ),
  },
});
