"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("collections", "type");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("collections", "type", {
      type: Sequelize.STRING,
      defaultValue: "atlas",
    });
  },
};
