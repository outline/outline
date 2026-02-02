'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('collections');

    if (!tableDefinition.state) {
      await queryInterface.addColumn('collections', 'state', {
        type: Sequelize.BLOB,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('collections', 'state');
  }
};
