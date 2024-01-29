"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("file_operations", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      state: {
        type: Sequelize.ENUM(
          "creating",
          "uploading",
          "complete",
          "error",
          "expired"
        ),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM("import", "export"),
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING,
      },
      url: {
        type: Sequelize.STRING,
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
        },
      },
      collectionId: {
        type: Sequelize.UUID,
        references: {
          model: "collections",
        },
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams",
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
    await queryInterface.addIndex("file_operations", ["type", "state"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("file_operations", ["type", "state"]);
    await queryInterface.dropTable("file_operations");
  },
};
