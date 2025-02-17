'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
async up (queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE EXTENSION IF NOT EXISTS "pg_trgm";`,
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY documents_title_idx ON documents USING GIN (title gin_trgm_ops);`,
    );
  },

  async down (queryInterface) {
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY documents_title_idx;`,
    );
  }
};
