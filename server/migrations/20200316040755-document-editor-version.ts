"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "editorVersion", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("revisions", "editorVersion", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "editorVersion");
    await queryInterface.removeColumn("revisions", "editorVersion");
  },
};
