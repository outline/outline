"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("collections", "templateManagement", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "admin",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("collections", "templateManagement");
  },
};
