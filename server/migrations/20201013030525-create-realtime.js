'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('documents', 'state', {
      type: Sequelize.BLOB
    });
    await queryInterface.addColumn('teams', 'multiplayerEditor', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('documents', 'state');
    await queryInterface.removeColumn('teams', 'multiplayerEditor');
  }
};