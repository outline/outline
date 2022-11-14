"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("comments", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "documents"
        }
      },
      parentCommentId: {
        type: Sequelize.UUID,
        allowNull: true,
        onDelete: "cascade",
        references: {
          model: "comments"
        }
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users"
        }
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolvedById: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users"
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex("comments", ["documentId"]);
    await queryInterface.addIndex("comments", ["createdAt"]);
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.dropTable("comments");
  }
};