"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "state", {
      type: Sequelize.BLOB,
    });
    await queryInterface.addColumn("teams", "collaborativeEditing", {
      type: Sequelize.BOOLEAN,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "state");
    await queryInterface.removeColumn("teams", "collaborativeEditing");
  },
};
