"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("groups", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams"
        }
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users"
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("groups", ["teamId"]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("groups");
  }
};
