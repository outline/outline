'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.dropTable("notification_settings");
  },

  async down (queryInterface, Sequelize) {
    throw new Error("Cannot undo this migration.")
  }
};
