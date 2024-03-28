'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE users ALTER COLUMN role SET NOT NULL;'
    );
  },

  async down (queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE users ALTER COLUMN role DROP NOT NULL;'
    );
  }
};