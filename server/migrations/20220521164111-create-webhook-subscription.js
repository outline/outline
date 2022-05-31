"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "webhook_subscriptions",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          createdById: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
            },
          },
          url: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          enabled: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          secret: {
            type: Sequelize.BLOB,
            allowNull: false,
          },
          events: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: false,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );
    });
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("webhooks_subscriptions");
  },
};
