"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("revisions", "state", {
      type: Sequelize.BLOB,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("revisions", "state");
  },
};
