"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn("shares", "urlId", {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    } catch (err) {
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn("shares", "urlId");
    } catch (err) {
      throw err;
    }
  },
};
