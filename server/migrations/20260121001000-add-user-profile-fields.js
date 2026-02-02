"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "profile", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn("user_authentications", "profile", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("user_authentications", "profile");
    await queryInterface.removeColumn("users", "profile");
  },
};
