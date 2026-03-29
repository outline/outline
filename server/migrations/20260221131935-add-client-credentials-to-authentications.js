"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("authentications", "clientId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("authentications", "clientSecret", {
      type: Sequelize.BLOB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("authentications", "clientId");
    await queryInterface.removeColumn("authentications", "clientSecret");
  },
};
