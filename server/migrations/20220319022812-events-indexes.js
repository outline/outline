'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex("events", ["createdAt"], {
      name: "events_created_at",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("events", "events_created_at");
  }
};
