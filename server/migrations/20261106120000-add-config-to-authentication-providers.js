"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("authentication_providers", "config", {
      type: Sequelize.BLOB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("authentication_providers", "config");
  },
};
