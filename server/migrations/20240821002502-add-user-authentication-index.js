'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex('user_authentications', ['userId']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('user_authentications', ['userId']);
  }
};
