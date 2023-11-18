'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("shares", "domain", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("shares", "domain");
  }
};
