"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers the events.list audit log query (teamId filter + createdAt
    // ordering with pagination).
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "events_team_id_created_at" ON "events" ("teamId", "createdAt");'
    );

    // Covers share lookups by document in shareLoader (shares.info flow);
    // the foreign key column has no index by default.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "shares_document_id" ON "shares" ("documentId");'
    );

    // Covers share lookups by collection in shareLoader (shares.info flow).
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "shares_collection_id" ON "shares" ("collectionId");'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "shares_collection_id";'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "shares_document_id";'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "events_team_id_created_at";'
    );
  },
};
