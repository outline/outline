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
            onDelete: "cascade",
            references: {
              model: "webhook_subscriptions",
            },
          },
          status: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          statusCode: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          requestBody: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          requestHeaders: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          responseBody: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          responseHeaders: {
            type: Sequelize.JSONB,
            allowNull: true,
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
      await queryInterface.addIndex(
        "webhook_deliveries",
        ["webhookSubscriptionId"],
        {
          name: "webhook_deliveries_webhook_subscription_id",
          transaction,
        }
      );
      await queryInterface.addIndex("webhook_deliveries", ["createdAt"], {
        name: "webhook_deliveries_createdAt",
        transaction,
      });
    });
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("webhook_deliveries");
  },
};
