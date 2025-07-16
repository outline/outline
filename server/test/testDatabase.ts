import { Sequelize } from "sequelize-typescript";
import env from "@server/env";
import * as models from "@server/models";
import { createDatabaseInstance } from "@server/storage/database";

/**
 * Performance-optimized test database configuration.
 * Uses SQLite in-memory for unit tests and PostgreSQL for integration tests.
 */

export function createTestDatabase(): Sequelize {
  // Use SQLite in-memory for maximum performance in unit tests
  // unless specifically configured to use PostgreSQL
  const usePostgres =
    process.env.TEST_USE_POSTGRES === "true" ||
    process.env.NODE_ENV === "test-integration";

  if (usePostgres) {
    // Use PostgreSQL for integration tests that require specific features
    return createDatabaseInstance(
      env.DATABASE_URL ||
        "postgres://postgres:password@localhost:5432/outline_test",
      models
    );
  } else {
    // Use SQLite in-memory for unit tests - orders of magnitude faster
    const sqliteConfig = {
      dialect: "sqlite" as const,
      storage: ":memory:",
      logging: false, // Disable logging for performance
      pool: {
        max: 1,
        min: 1,
        acquire: 30000,
        idle: 10000,
      },
    };

    return createDatabaseInstance(sqliteConfig, models);
  }
}

/**
 * Optimized test setup that avoids expensive operations
 */
export async function setupTestDatabase(sequelize: Sequelize): Promise<void> {
  try {
    // For SQLite in-memory, we need to sync the schema
    if (sequelize.getDialect() === "sqlite") {
      await sequelize.sync({ force: true });
    } else {
      // For PostgreSQL, just ensure connection
      await sequelize.authenticate();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to setup test database:", error);
    throw error;
  }
}

/**
 * Fast cleanup for test databases
 */
export async function cleanupTestDatabase(sequelize: Sequelize): Promise<void> {
  if (sequelize.getDialect() === "sqlite") {
    // For SQLite, just drop and recreate tables - very fast
    await sequelize.sync({ force: true });
  } else {
    // For PostgreSQL, use transaction rollback (implemented in setup.ts)
    // This function is mainly for compatibility
  }
}
