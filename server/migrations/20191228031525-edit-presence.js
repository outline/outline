"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("views", "lastEditingAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("views", "lastEditingAt");
  },
};
