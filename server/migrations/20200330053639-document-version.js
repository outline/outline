"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "version", {
      type: Sequelize.SMALLINT,
      allowNull: true,
    });
    await queryInterface.addColumn("revisions", "version", {
      type: Sequelize.SMALLINT,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "version");
    await queryInterface.removeColumn("revisions", "version");
  },
};
