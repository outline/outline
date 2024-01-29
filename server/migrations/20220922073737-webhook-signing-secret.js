"use strict";

module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.addColumn("webhook_subscriptions", "secret", {
      type: Sequelize.BLOB,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.removeColumn("webhook_subscriptions", "secret");
  }
};
