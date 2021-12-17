"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      update integrations
      set "events" = '{documents.update,documents.publish}'
      where type = 'post'
    `);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      update integrations
      set "events" = NULL
      where type = 'post'
    `);
  },
};
