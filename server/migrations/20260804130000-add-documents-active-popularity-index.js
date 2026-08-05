"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers the popularity score task's scan for documents that already
    // carry a score so they decay back to zero. Partial so it only indexes
    // the small subset with a non-zero score.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "documents_active_popularity_score" ON "documents" ("id") WHERE "popularityScore" > 0;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "documents_active_popularity_score";'
    );
  },
};
