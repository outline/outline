"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("shares", "published", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.sequelize.query(`
      update shares
      set "published" = true
    `);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("shares", "published");
  },
};
