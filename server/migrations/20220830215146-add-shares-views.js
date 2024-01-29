'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("shares", "views", {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("shares", "views");
  },
};
