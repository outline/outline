"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("search_queries", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
      },
      userId: {
        type: Sequelize.UUID,
        references: {
          model: "users",
        },
      },
      teamId: {
        type: Sequelize.UUID,
        references: {
          model: "teams",
        },
      },
      source: {
        type: Sequelize.ENUM("slack", "app", "api"),
        allowNull: false,
      },
      query: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      results: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("search_queries");
  },
};
