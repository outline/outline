"use strict";

const { v4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("pins", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "documents",
        },
      },
      collectionId: {
        type: Sequelize.UUID,
        allowNull: true,
        onDelete: "cascade",
        references: {
          model: "collections",
        },
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        onDelete: "cascade",
        references: {
          model: "teams",
        },
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      index: {
        type: Sequelize.STRING,
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
    });
    await queryInterface.addIndex("pins", ["collectionId"]);

    const createdAt = new Date();
    const [documents] = await queryInterface.sequelize.query(`SELECT "id","collectionId","teamId","pinnedById" FROM documents WHERE "pinnedById" IS NOT NULL`);

    for (const document of documents) {
      await queryInterface.sequelize.query(`
        INSERT INTO pins (
          "id",
          "documentId",
          "collectionId",
          "teamId",
          "createdById",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          :id,
          :documentId,
          :collectionId,
          :teamId,
          :createdById,
          :createdAt,
          :updatedAt
        )
      `, {
        replacements: {
          id: v4(),
          documentId: document.id,
          collectionId: document.collectionId,
          teamId: document.teamId,
          createdById: document.pinnedById,
          updatedAt: createdAt,
          createdAt,
        },
      });
    }
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("pins");
  },
};
