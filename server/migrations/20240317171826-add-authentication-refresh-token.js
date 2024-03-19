'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("authentications", "refreshToken", {
      type: Sequelize.BLOB,
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("authentications", "refreshToken");
  }
};