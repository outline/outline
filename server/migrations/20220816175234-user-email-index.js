'use strict';

module.exports = {
  async up (queryInterface) {
    await queryInterface.addIndex("users", ["email"]);
  },

  async down (queryInterface) {
    await queryInterface.removeIndex("users", ["email"]);
  }
};
