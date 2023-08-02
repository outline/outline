'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("webhook_subscriptions", "webhook_subscriptions_teamId_fkey")
    await queryInterface.changeColumn("webhook_subscriptions", "teamId", {
      type: Sequelize.UUID,
      allowNull: false,
      onDelete: "cascade",
      references: {
        model: "teams",
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint("webhook_subscriptions", "webhook_subscriptions_teamId_fkey")
    await queryInterface.changeColumn("webhook_subscriptions", "teamId", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "teams",
      },
    });
  }
};
