'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('documents', 'state', {
      type: Sequelize.BLOB
    });
    await queryInterface.addColumn('teams', 'features', {
      type: Sequelize.JSONB,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('documents', 'state');
    await queryInterface.removeColumn('teams', 'features');
  }
};