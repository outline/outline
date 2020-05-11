'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('teams', 'giteaId', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    await queryInterface.addIndex('teams', ['giteaId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('teams', 'giteaId');
    await queryInterface.removeIndex('teams', ['giteaId']);
  }
}