"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "tags",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "teams", key: "id" },
            onDelete: "CASCADE",
          },
          createdById: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction }
      );

      await queryInterface.addIndex("tags", ["teamId", "name"], {
        unique: true,
        name: "tags_team_id_name_unique",
        transaction,
      });

      await queryInterface.createTable(
        "document_tags",
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          documentId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "documents", key: "id" },
            onDelete: "CASCADE",
          },
          tagId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "tags", key: "id" },
            onDelete: "CASCADE",
          },
          createdById: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction }
      );

      await queryInterface.addIndex("document_tags", ["documentId", "tagId"], {
        unique: true,
        name: "document_tags_document_id_tag_id_unique",
        transaction,
      });
      await queryInterface.addIndex("document_tags", ["tagId"], { transaction });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("document_tags", { transaction });
      await queryInterface.dropTable("tags", { transaction });
    });
  },
};
