"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers share lookups by document and collection, which run on every
    // document open.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "shares_document_id_not_revoked" ON "shares" ("documentId") WHERE "revokedAt" IS NULL;'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "shares_collection_id_not_revoked" ON "shares" ("collectionId") WHERE "revokedAt" IS NULL;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "shares_collection_id_not_revoked";'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "shares_document_id_not_revoked";'
    );
  },
};
