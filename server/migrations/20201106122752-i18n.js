"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "language", {
      type: Sequelize.STRING,
      defaultValue: process.env.DEFAULT_LANGUAGE,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "language");
  },
};
