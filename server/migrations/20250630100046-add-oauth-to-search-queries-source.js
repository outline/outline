'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_search_queries_source ADD VALUE 'oauth'"
    );
  },

  async down (queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This would require recreating the enum type and updating all references
    throw new Error('Cannot rollback adding enum value to PostgreSQL');
  }
};
