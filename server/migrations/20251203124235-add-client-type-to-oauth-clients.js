"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("oauth_clients", "clientType", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "confidential",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("oauth_clients", "clientType");
  },
};
