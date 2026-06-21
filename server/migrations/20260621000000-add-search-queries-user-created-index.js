"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers the searches.list query (userId filter + createdAt ordering).
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "search_queries_user_id_created_at" ON "search_queries" ("userId", "createdAt");'
    );

    // Now redundant: fully covered by the composite index above as a
    // leftmost-prefix.
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "search_queries_user_id";'
    );

    // Unused: no query filters or orders by createdAt without also
    // constraining userId.
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "search_queries_created_at";'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "search_queries_created_at" ON "search_queries" ("createdAt");'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "search_queries_user_id" ON "search_queries" ("userId");'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "search_queries_user_id_created_at";'
    );
  },
};
