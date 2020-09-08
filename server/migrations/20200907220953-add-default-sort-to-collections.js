'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('collections', 'defaultSort', {
      type: Sequelize.STRING,
      defaultValue: "updatedAt,DESC"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('collections', 'defaultSort');
  }
};