"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "document_reminders",
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
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          ownerId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          editorId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          lastSentAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          nextSendAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          intervalDays: {
            type: Sequelize.INTEGER,
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
        "document_reminders",
        ["documentId"],
        { transaction }
      );
      await queryInterface.addIndex(
        "document_reminders",
        ["ownerId"],
        { transaction }
      );
      await queryInterface.addIndex(
        "document_reminders",
        ["editorId"],
        { transaction }
      );
      await queryInterface.addIndex(
        "document_reminders",
        ["isActive", "nextSendAt"],
        { transaction }
      );
      await queryInterface.addIndex(
        "document_reminders",
        ["documentId", "editorId"],
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        "document_reminders",
        ["documentId"],
        { transaction }
      );
      await queryInterface.removeIndex(
        "document_reminders",
        ["ownerId"],
        { transaction }
      );
      await queryInterface.removeIndex(
        "document_reminders",
        ["editorId"],
        { transaction }
      );
      await queryInterface.removeIndex(
        "document_reminders",
        ["isActive", "nextSendAt"],
        { transaction }
      );
      await queryInterface.removeIndex(
        "document_reminders",
        ["documentId", "editorId"],
        { transaction }
      );
      await queryInterface.dropTable("document_reminders", { transaction });
    });
  },
};
