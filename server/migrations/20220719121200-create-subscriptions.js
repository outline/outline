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
          event: {
            type: Sequelize.STRING,
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
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "subscriptions",
        ["userId", "documentId", "event"],
        {
          name: "subscriptions_user_id_document_id_event",
          type: "UNIQUE",
          transaction,
        }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("subscriptions", [
      "userId",
      "documentId",
      "event",
    ]);
    return queryInterface.dropTable("subscriptions");
  },
};
