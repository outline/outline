"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "plugin_configurations",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal("gen_random_uuid()"),
          },
          pluginId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          config: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "teams",
            },
            onDelete: "cascade",
          },
          createdById: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
            },
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "plugin_configurations",
        ["pluginId", "teamId"],
        {
          unique: true,
          name: "plugin_configurations_plugin_id_team_id_unique",
          transaction,
        }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.dropTable("plugin_configurations");
  },
};
