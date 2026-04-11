"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("shares", "title", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("shares", "logoUrl", {
      type: Sequelize.STRING(4096),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("shares", "title");
    await queryInterface.removeColumn("shares", "logoUrl");
  },
};
