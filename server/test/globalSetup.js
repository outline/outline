import { sequelize } from "@server/storage/database";

module.exports = async function () {
  // Performance optimization: Instead of expensive TRUNCATE CASCADE,
  // we'll use a transaction-based approach for test isolation.
  // This setup ensures the database is ready for transaction-based testing.

  try {
    // Ensure database connection is established
    await sequelize.authenticate();

    // Only perform minimal setup - individual tests will use transactions
    // eslint-disable-next-line no-console
    console.log("Database connection established for testing");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to establish database connection:", error);
    throw error;
  }
};
