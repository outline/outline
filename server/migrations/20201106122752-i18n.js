'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('teams', 'language', {
      type: Sequelize.STRING,
      defaultValue: process.env.DEFAULT_LANGUAGE,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('teams', 'language');
  }
};
