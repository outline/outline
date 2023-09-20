"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("attachments", ["key"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("attachments", ["key"]);
  },
};
