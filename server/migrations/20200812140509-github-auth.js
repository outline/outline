"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "githubId", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addIndex("teams", ["githubId"]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teams", "githubId");
    await queryInterface.removeIndex("teams", ["githubId"]);
  },
};
