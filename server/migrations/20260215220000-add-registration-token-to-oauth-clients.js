"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "oauth_clients",
      "registrationAccessTokenHash",
      {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "oauth_clients",
      "registrationAccessTokenHash"
    );
  },
};
