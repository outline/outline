"use strict";

module.exports = {
  async up(queryInterface) {
    return queryInterface.removeColumn("users", "username");
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.addColumn("users", "username", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
