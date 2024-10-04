"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE EXTENSION IF NOT EXISTS "unaccent";`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP EXTENSION IF EXISTS "unaccent";`
    );
  },
};
