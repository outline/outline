import cluster from "node:cluster";
import path from "node:path";
import type {
  InferAttributes,
  InferCreationAttributes,
  Transaction,
  TransactionOptions,
} from "sequelize";
import sequelizeStrictAttributes from "sequelize-strict-attributes";
import type { SequelizeOptions } from "sequelize-typescript";
import { Sequelize } from "sequelize-typescript";
import type { MigrationError } from "umzug";
import { Umzug, SequelizeStorage } from "umzug";
import { toError } from "@shared/utils/error";
import env from "@server/env";
import { ClientClosedRequestError } from "@server/errors";
import type Model from "@server/models/base/Model";
import Logger from "../logging/Logger";
import * as models from "../models";
import { requestContext } from "./requestContext";
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

const isApiProcess =
  (env.SERVICES.includes("web") ||
    env.SERVICES.includes("collaboration") ||
    env.SERVICES.includes("websockets") ||
    env.SERVICES.includes("admin")) &&
  !env.SERVICES.includes("worker") &&
  !env.SERVICES.includes("cron");

// Request-handling processes get a Postgres `statement_timeout` matching the
// HTTP request timeout, so a single slow query cannot hold a connection past
// the point at which its response could be delivered. Applied as `SET LOCAL`
// inside each transaction so the value is scoped to the transaction.
const statementTimeout =
  isApiProcess && cluster.isWorker ? env.REQUEST_TIMEOUT : undefined;

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

    if (statementTimeout) {
      instance = applyStatementTimeoutToTransactions(
        instance,
        Number(statementTimeout)
      );
    }

    if (env.isTest) {
      instance = monkeyPatchSequelizeErrorsForTests(instance);
    }

    // Skip queries when the originating HTTP request socket has been destroyed
    // (e.g. client disconnected or server timeout). This avoids wasting database
    // resources on work whose response can never be delivered.
    const assertConnectionOpen = () => {
      const store = requestContext.getStore();
      if (store?.req.socket.destroyed) {
        throw ClientClosedRequestError();
      }
    };
    instance.addHook("beforeFind", assertConnectionOpen);
    instance.addHook("beforeCount", assertConnectionOpen);

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
    if (
      error instanceof Error &&
      error.message.includes("does not support SSL")
    ) {
      Logger.fatal(
        "The database does not support SSL connections. Set the `PGSSLMODE` environment variable to `disable` or enable SSL on your database server.",
        error
      );
    } else {
      Logger.fatal("Failed to connect to database", toError(error));
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
            ? `Migrating ${String(params.name)}…`
            : `Migrated ${String(params.name)} in ${String(params.durationSeconds)}s`
        ),
      debug: (params) =>
        Logger.debug(
          "database",
          params.event === "migrating"
            ? `Migrating ${String(params.name)}…`
            : `Migrated ${String(params.name)} in ${String(params.durationSeconds)}s`
        ),
    },
  });
}

/**
 * Wraps `sequelize.transaction()` so that every transaction issues
 * `SET LOCAL statement_timeout` immediately after it begins. Using `SET LOCAL`
 * scopes the value to the transaction, preventing it from leaking to other
 * consumers (e.g. background workers) sharing the same underlying connection
 * via pgbouncer's transaction pooling.
 */
export function applyStatementTimeoutToTransactions(
  instance: Sequelize,
  timeoutMs: number
) {
  const origTransaction = instance.transaction.bind(
    instance
  ) as Sequelize["transaction"];

  const setLocalTimeout = (t: Transaction) =>
    instance.query(`SET LOCAL statement_timeout = ${timeoutMs}`, {
      transaction: t,
    });

  instance.transaction = (async (
    optionsOrCallback?:
      | TransactionOptions
      | ((t: Transaction) => PromiseLike<unknown>),
    maybeCallback?: (t: Transaction) => PromiseLike<unknown>
  ) => {
    const autoCallback =
      typeof optionsOrCallback === "function"
        ? optionsOrCallback
        : maybeCallback;
    const options =
      typeof optionsOrCallback === "function" ? undefined : optionsOrCallback;

    if (autoCallback) {
      return origTransaction(options as TransactionOptions, async (t) => {
        await setLocalTimeout(t);
        return autoCallback(t);
      });
    }

    const t = await origTransaction(options);
    try {
      await setLocalTimeout(t);
    } catch (err) {
      // Roll back so the started transaction does not linger on the pooled
      // connection until idle-in-transaction timeout closes it.
      try {
        await t.rollback();
      } catch {
        // Ignore rollback failure; the original error is more informative.
      }
      throw err;
    }
    return t;
  }) as typeof instance.transaction;

  return instance;
}

/**
 * Fixed in Sequelize v7, but hasn't been back-ported to Sequelize v6.
 * See https://github.com/sequelize/sequelize/issues/14807#issuecomment-1854398131
 */
export function monkeyPatchSequelizeErrorsForTests(instance: Sequelize) {
  const sequelizeVersion = (Sequelize as unknown as { version: string })
    .version;
  const major = sequelizeVersion.split(".").map(Number)[0];

  if (major >= 7) {
    Logger.fatal(
      "Redundant patch",
      new Error(
        "This patch was made redundant in Sequelize v7, you should check!"
      )
    );
  }

  const origQueryFunc = instance.query.bind(instance);
  instance.query = (async (...args: Parameters<typeof origQueryFunc>) => {
    try {
      return await origQueryFunc(...args);
    } catch (err) {
      // Ensure error appears in test output, not swallowed by Sequelize internals
      const error = err as Error & { parent?: Error };
      Logger.error(error.message, error.parent ?? error);
      throw err;
    }
  }) as typeof instance.query;

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
