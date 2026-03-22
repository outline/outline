"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn("teams", "guidanceMCP", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    return queryInterface.removeColumn("teams", "guidanceMCP");
  },
};
