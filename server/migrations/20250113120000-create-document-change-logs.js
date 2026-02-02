"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "document_change_logs",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
          },
          documentId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "documents",
            },
            onDelete: "CASCADE",
          },
          ownerId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
            },
            onDelete: "CASCADE",
          },
          changedById: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
            },
            onDelete: "CASCADE",
          },
          changeType: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          metadata: {
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

      // Add indexes for efficient queries
      await queryInterface.addIndex(
        "document_change_logs",
        ["documentId"],
        { transaction }
      );
      await queryInterface.addIndex(
        "document_change_logs",
        ["ownerId"],
        { transaction }
      );
      await queryInterface.addIndex(
        "document_change_logs",
        ["changedById"],
        { transaction }
      );
      await queryInterface.addIndex(
        "document_change_logs",
        ["changeType"],
        { transaction }
      );
      await queryInterface.addIndex(
        "document_change_logs",
        ["createdAt"],
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "document_change_logs",
        ["documentId"],
        { transaction }
      );
      await queryInterface.removeIndex(
        "document_change_logs",
        ["ownerId"],
        { transaction }
      );
      await queryInterface.removeIndex(
        "document_change_logs",
        ["changedById"],
        { transaction }
      );
      await queryInterface.removeIndex(
        "document_change_logs",
        ["changeType"],
        { transaction }
      );
      await queryInterface.removeIndex(
        "document_change_logs",
        ["createdAt"],
        { transaction }
      );
      await queryInterface.dropTable("document_change_logs", { transaction });
    });
  },
};
