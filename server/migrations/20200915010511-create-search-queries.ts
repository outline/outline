"use strict";

module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
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
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("search_queries");
  },
};
