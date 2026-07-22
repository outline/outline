"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_relationships_type" ADD VALUE IF NOT EXISTS 'relation';`
    );
  },

  async down() {
    // Postgres does not support removing a value from an enum type; the
    // unused value is harmless if the feature is rolled back.
  },
};
