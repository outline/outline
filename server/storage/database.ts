import path from "path";
import { InferAttributes, InferCreationAttributes } from "sequelize";
import sequelizeStrictAttributes from "sequelize-strict-attributes";
import { Sequelize } from "sequelize-typescript";
import { Umzug, SequelizeStorage, MigrationError } from "umzug";
import env from "@server/env";
import Model from "@server/models/base/Model";
import Logger from "../logging/Logger";
import * as models from "../models";

const isSSLDisabled = env.PGSSLMODE === "disable";
const poolMax = env.DATABASE_CONNECTION_POOL_MAX ?? 5;
const poolMin = env.DATABASE_CONNECTION_POOL_MIN ?? 0;
const url = env.DATABASE_CONNECTION_POOL_URL || env.DATABASE_URL;
const schema = env.DATABASE_SCHEMA;

export function createDatabaseInstance(
  databaseUrl: string,
  input: {
    [key: string]: typeof Model<
      InferAttributes<Model>,
      InferCreationAttributes<Model>
    >;
  }
): Sequelize {
  try {
    const instance = new Sequelize(databaseUrl, {
      logging: (msg) =>
        process.env.DEBUG?.includes("database") &&
        Logger.debug("database", msg),
      typeValidation: true,
      logQueryParameters: env.isDevelopment,
      dialectOptions: {
        ssl:
          env.isProduction && !isSSLDisabled
            ? {
                // Ref.: https://github.com/brianc/node-postgres/issues/2009
                rejectUnauthorized: false,
              }
            : false,
      },
      models: Object.values(input),
      pool: {
        max: poolMax,
        min: poolMin,
        acquire: 30000,
        idle: 10000,
      },
      schema,
    });
    sequelizeStrictAttributes(instance);
    return instance;
  } catch (error) {
    Logger.fatal(
      "Could not connect to database",
      databaseUrl
        ? new Error(
            `Failed to parse: "${databaseUrl}". Ensure special characters in database URL are encoded`
          )
        : new Error(`DATABASE_URL is not set.`)
    );
    process.exit(1);
  }
}

/**
 * This function is used to test the database connection on startup. It will
 * throw a descriptive error if the connection fails.
 */
export const checkConnection = async (db: Sequelize) => {
  try {
    await db.authenticate();
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

export function createMigrationRunner(
  db: Sequelize,
  glob:
    | string
    | [
        string,
        {
          cwd?: string | undefined;
          ignore?: string | string[] | undefined;
        }
      ]
) {
  return new Umzug({
    migrations: {
      glob,
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
    context: db.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize: db }),
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
}

export const sequelize = createDatabaseInstance(url, models);

export const migrations = createMigrationRunner(sequelize, [
  "migrations/*.js",
  { cwd: path.resolve("server") },
]);
