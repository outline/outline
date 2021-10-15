'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("teams", "defaultUserRole", {
      type: Sequelize.STRING,
      defaultValue: "member",
      allowNull: false,
      validate: {
        isIn: [["viewer", "member", "admin"]],
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("teams", "defaultUserRole");
  }
};
