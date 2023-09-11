"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("document_users", {
      permission: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "read_write",
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "documents",
        },
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "users",
        },
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("document_users", ["documentId", "userId"]);
    await queryInterface.addIndex("document_users", ["userId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("document_users", ["userId"]);
    await queryInterface.removeIndex("document_users", [
      "documentId",
      "userId",
    ]);
    await queryInterface.dropTable("document_users");
  },
};
