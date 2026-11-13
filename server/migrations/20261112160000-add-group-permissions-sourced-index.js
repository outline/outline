"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Covers lookups of inherited group permissions by document and group.
    // Partial so it only indexes rows that are sourced from a parent.
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "group_permissions_document_id_group_id_sourced" ON "group_permissions" ("documentId", "groupId") WHERE "sourceId" IS NOT NULL AND "deletedAt" IS NULL;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "group_permissions_document_id_group_id_sourced";'
    );
  },
};
