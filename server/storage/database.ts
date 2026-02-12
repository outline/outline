import path from "node:path";
import type { InferAttributes, InferCreationAttributes } from "sequelize";
import sequelizeStrictAttributes from "sequelize-strict-attributes";
import type { SequelizeOptions } from "sequelize-typescript";
import { Sequelize } from "sequelize-typescript";
import type { MigrationError } from "umzug";
import { Umzug, SequelizeStorage } from "umzug";
import env from "@server/env";
import type Model from "@server/models/base/Model";
import Logger from "../logging/Logger";
import * as models from "../models";
import { getConnectionName } from "./utils";

/**
 * Returns database configuration for Sequelize constructor.
 * Either uses DATABASE_URL or constructs options from individual components.
 */
function getDatabaseConfig() {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  // If using individual components, return Sequelize options object
  if (env.DATABASE_HOST && env.DATABASE_NAME && env.DATABASE_USER) {
    return {
      database: env.DATABASE_NAME,
      username: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD || undefined,
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT || 5432,
      dialect: "postgres" as const,
    };
  }

  throw new Error(
    "DATABASE_URL is not set or individual database components (DATABASE_HOST, DATABASE_NAME, DATABASE_USER) are not properly configured."
  );
}

const isSSLDisabled = env.PGSSLMODE === "disable";
const poolMax = env.DATABASE_CONNECTION_POOL_MAX ?? 5;
const poolMin = env.DATABASE_CONNECTION_POOL_MIN ?? 0;
const databaseConfig = env.DATABASE_CONNECTION_POOL_URL || getDatabaseConfig();
const schema = env.DATABASE_SCHEMA;

export function createDatabaseInstance(
  databaseConfig: string | object,
  input: {
    [key: string]: typeof Model<
      InferAttributes<Model>,
      InferCreationAttributes<Model>
    >;
  },
  options?: { readOnly?: boolean }
): Sequelize {
  try {
    let instance;
    const isReadOnly = options?.readOnly ?? false;

    // Common options for both URL and object configurations
    const commonOptions: SequelizeOptions = {
      logging: (msg) =>
        process.env.DEBUG?.includes("database") &&
        Logger.debug("database", msg),
      typeValidation: true,
      logQueryParameters: env.isDevelopment,
      dialectOptions: {
        application_name: getConnectionName(),
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
        // Read-only connections can have larger pools since there's no write contention
        max: isReadOnly ? poolMax * 2 : poolMax,
        min: poolMin,
        acquire: 30000,
        idle: 10000,
      },
      // Only retry on deadlocks for write connections
      retry: isReadOnly
        ? undefined
        : {
            match: [/deadlock/i],
            max: 3,
            backoffBase: 200,
            backoffExponent: 1.5,
          },
      schema,
    };

    // If databaseConfig is a string, it's a URL; if it's an object, merge with common options
    if (typeof databaseConfig === "string") {
      instance = new Sequelize(databaseConfig, commonOptions);
    } else {
      instance = new Sequelize({ ...databaseConfig, ...commonOptions });
    }

    sequelizeStrictAttributes(instance);

    if (env.isTest) {
      instance = monkeyPatchSequelizeErrorsForJest(instance);
    }

    // Add hooks to warn about write operations on read-only connections
    if (isReadOnly) {
      const warnWriteOperation = (operation: string) => {
        Logger.warn(
          `Attempted ${operation} operation on read-only database connection`
        );
      };

      instance.addHook("beforeCreate", () => warnWriteOperation("CREATE"));
      instance.addHook("beforeUpdate", () => warnWriteOperation("UPDATE"));
      instance.addHook("beforeDestroy", () => warnWriteOperation("DELETE"));
      instance.addHook("beforeBulkCreate", () =>
        warnWriteOperation("BULK CREATE")
      );
      instance.addHook("beforeBulkUpdate", () =>
        warnWriteOperation("BULK UPDATE")
      );
      instance.addHook("beforeBulkDestroy", () =>
        warnWriteOperation("BULK DELETE")
      );
    }

    return instance;
  } catch (_err) {
    Logger.fatal(
      "Could not connect to database",
      typeof databaseConfig === "string"
        ? new Error(
            `Failed to parse: "${databaseConfig}". Ensure special characters in database URL are encoded`
          )
        : new Error(
            `Failed to connect using database credentials. Please check DATABASE_HOST, DATABASE_NAME, DATABASE_USER configuration`
          )
    );
    // To satisfy TypeScript that a Sequelize instance is always returned
    throw _err;
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
        },
      ]
) {
  return new Umzug({
    migrations: {
      glob,
      resolve: ({ name, path, context }) => {
        // oxlint-disable-next-line @typescript-eslint/no-require-imports
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

/**
 * Fixed in Sequelize v7, but hasn't been back-ported to Sequelize v6.
 * See https://github.com/sequelize/sequelize/issues/14807#issuecomment-1854398131
 */
export function monkeyPatchSequelizeErrorsForJest(instance: Sequelize) {
  if (typeof jest === "undefined") {
    return instance;
  }

  const sequelizeVersion = (Sequelize as any).version;
  const major = sequelizeVersion.split(".").map(Number)[0];

  if (major >= 7) {
    Logger.fatal(
      "Redundant patch",
      new Error(
        "This patch was made redundant in Sequelize v7, you should check!"
      )
    );
  }

  const origQueryFunc = instance.query;
  instance.query = async function query(this: Sequelize, ...args: any[]) {
    let result;
    try {
      result = await origQueryFunc.apply(this, args as any);
    } catch (err: any) {
      // Ensure error appears in Jest output, not swallowed by Sequelize internals
      Logger.error(err.message, err.parent);
      throw err;
    }
    return result;
  } as typeof origQueryFunc;

  return instance;
}

export const sequelize = createDatabaseInstance(databaseConfig, models);

/**
 * Read-only database connection for read replicas.
 * Falls back to the main connection if DATABASE_READ_ONLY_URL is not set.
 */
export const sequelizeReadOnly = env.DATABASE_READ_ONLY_URL
  ? createDatabaseInstance(
      env.DATABASE_READ_ONLY_URL,
      {},
      {
        readOnly: true,
      }
    )
  : sequelize;

export const migrations = createMigrationRunner(sequelize, [
  "migrations/*.js",
  { cwd: path.resolve("server") },
]);
