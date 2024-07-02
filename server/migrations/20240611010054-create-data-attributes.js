"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "data_attributes",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          createdById: {
            type: Sequelize.UUID,
            allowNull: false,
            onDelete: "cascade",
            references: {
              model: "users",
            },
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            onDelete: "cascade",
            references: {
              model: "teams",
            }
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          description: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          dataType: {
            type: Sequelize.ENUM("string", "integer", "boolean", "list"),
            allowNull: false,
          },
          options: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          pinned: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "data_attributes",
        ["teamId"],
        { transaction }
      );

      await queryInterface.addColumn("documents", "dataAttributes", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("data_attributes", { transaction });
      await queryInterface.removeColumn("documents", "dataAttributes", {
        transaction,
      });
    });
  }
};
