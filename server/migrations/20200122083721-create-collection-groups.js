"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("collection_groups", {
      collectionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "collections",
        },
      },
      groupId: {
        type: Sequelize.UUID,
        allowNull: false,
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
    await queryInterface.addIndex("collection_groups", [
      "collectionId",
      "groupId",
    ]);
    await queryInterface.addIndex("collection_groups", ["groupId"]);
    await queryInterface.addIndex("collection_groups", ["deletedAt"]);
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("collection_groups");
  },
};
