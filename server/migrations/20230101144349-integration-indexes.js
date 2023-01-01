'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex("integrations", ["teamId", "type", "service"]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex("integrations", ["teamId", "type", "service"]);
  }
};
