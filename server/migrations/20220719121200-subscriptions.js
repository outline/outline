"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "subscriptions",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          userId: {
            type: Sequelize.UUID,
            allowNull: false,
            onDelete: "cascade",
            references: {
              model: "users",
            },
          },
          documentId: {
            type: Sequelize.UUID,
            allowNull: true,
            onDelete: "cascade",
            references: {
              model: "documents",
            },
          },
          enabled: {
            type: Sequelize.BOOLEAN,
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

      await queryInterface.addIndex("subscriptions", ["userId", "documentId"], {
        name: "subscriptions_user_id_document_id",
        type: "UNIQUE",
        transaction,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("subscriptions", ["userId", "documentId"]);
    return queryInterface.dropTable("subscriptions");
  },
};
