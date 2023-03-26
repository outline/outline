"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("user_authentications", "oidcTokenId", {
      type: Sequelize.BLOB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("user_authentications", "oidcTokenId");
  },
};
