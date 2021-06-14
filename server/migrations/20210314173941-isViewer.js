'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
     await queryInterface.addColumn("users", "isViewer", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "isViewer");
  }
};
