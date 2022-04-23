"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("team_domains", {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
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
        name: {
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
      }, {
        transaction
      });

      await queryInterface.addIndex("team_domains", ["teamId", "name"], {
        transaction,
        unique: true,
      });
    });
  },
  down: async (queryInterface) => {
    return queryInterface.dropTable("team_domains");
  },
};
