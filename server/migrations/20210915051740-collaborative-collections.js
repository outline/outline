"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("collections", "state", {
      type: Sequelize.BLOB,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("collections", "state");
  },
};
