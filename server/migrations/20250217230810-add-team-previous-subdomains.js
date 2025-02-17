"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("teams", "previousSubdomains", {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("teams", "previousSubdomains");
  },
};
