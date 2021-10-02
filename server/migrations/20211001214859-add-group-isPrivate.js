'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('groups', 'isPrivate', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('groups', 'isPrivate');
  }
};
