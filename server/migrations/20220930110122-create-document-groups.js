"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("document_groups", {
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "documents",
        },
      },
      groupId: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "groups",
        },
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      permission: {
        type: Sequelize.STRING,
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
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
    await queryInterface.addIndex("document_groups", [
      "documentId",
      "groupId",
    ]);
    await queryInterface.addIndex("document_groups", ["groupId"]);
    await queryInterface.addIndex("document_groups", ["deletedAt"]);
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("document_groups");
  },
};
