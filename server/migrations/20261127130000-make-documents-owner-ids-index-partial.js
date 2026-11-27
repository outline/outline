"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Most documents have no owners. A partial index skips them, so updates to
    // those rows do not write to this GIN index.
    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "documents_owner_ids_nonempty" ON "documents" USING GIN ("ownerIds") WHERE "ownerIds" <> '{}';`
    );
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "documents_owner_ids";'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "documents_owner_ids" ON "documents" USING GIN ("ownerIds");'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "documents_owner_ids_nonempty";'
    );
  },
};
