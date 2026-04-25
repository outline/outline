"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "document_insights",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          documentId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "documents",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "teams",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          viewCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          viewerCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          commentCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          reactionCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          revisionCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          editorCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
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
        "document_insights",
        ["documentId", "date"],
        { unique: true, transaction }
      );

      await queryInterface.addIndex("document_insights", ["teamId", "date"], {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("document_insights", { transaction });
    });
  },
};
