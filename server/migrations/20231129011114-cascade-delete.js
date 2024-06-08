'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("webhook_subscriptions", "webhook_subscriptions_createdById_fkey")
    await queryInterface.changeColumn("webhook_subscriptions", "createdById", {
      type: Sequelize.UUID,
      onDelete: "cascade",
      references: {
        model: "users",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("webhook_subscriptions", "webhook_subscriptions_createdById_fkey")
    await queryInterface.changeColumn("webhook_subscriptions", "createdById", {
      type: Sequelize.UUID,
      references: {
        model: "users",
      },
    });
  }
};
