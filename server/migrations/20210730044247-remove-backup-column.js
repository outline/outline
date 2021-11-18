"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "backup");
    await queryInterface.removeColumn("revisions", "backup");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "backup", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("revisions", "backup", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};
