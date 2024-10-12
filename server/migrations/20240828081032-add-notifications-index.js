"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("notifications", ["documentId", "userId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("notifications", ["documentId", "userId"]);
  },
};
