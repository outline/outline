"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("attachments", ["teamId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("attachments", ["teamId"]);
  },
};
