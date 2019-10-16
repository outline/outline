'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('teams', 'azureId', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    await queryInterface.addIndex('teams', ['azureId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('teams', ['azureId']);
    await queryInterface.removeColumn('teams', 'azureId');
  }
}