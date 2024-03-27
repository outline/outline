'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "role", {
      type: Sequelize.ENUM("admin", "member", "viewer", "guest"),
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn("users", "role");
  }
};