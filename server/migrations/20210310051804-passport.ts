"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "slackData");
    await queryInterface.removeColumn("teams", "slackData");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "slackData", {
      type: "JSONB",
      allowNull: true,
    });
    await queryInterface.addColumn("users", "slackData", {
      type: "JSONB",
      allowNull: true,
    });
  },
};
