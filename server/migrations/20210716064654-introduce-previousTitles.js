"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "previousTitles", {
      type: Sequelize.ARRAY(Sequelize.STRING),
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "previousTitles");
  },
};
