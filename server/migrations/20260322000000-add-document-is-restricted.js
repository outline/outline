"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "isPrivate", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addIndex("documents", ["isPrivate"]);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("documents", "isPrivate");
  },
};
