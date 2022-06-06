"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "webhook_deliveries",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          webhookSubscriptionId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "webhook_subscriptions",
            },
          },
          statusCode: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          requestBody: {
            type: Sequelize.JSONB,
            allowNull: false,
          },
          requestHeaders: {
            type: Sequelize.JSONB,
            allowNull: false,
          },
          responseBody: {
            type: Sequelize.BLOB,
            allowNull: true,
          },
          responseHeaders: {
            type: Sequelize.JSONB,
            allowNull: false,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        },
        { transaction }
      );
    });
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("webhook_deliveries");
  },
};

