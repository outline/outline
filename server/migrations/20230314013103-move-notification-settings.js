"use strict";

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "notificationSettings", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  },

  async down (queryInterface) {
    return queryInterface.removeColumn("users", "notificationSettings");
  }
};
