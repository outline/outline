"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn("collections", "display", {
        type: Sequelize.STRING,
        defaultValue: "list",
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn("collections", "display", { transaction });
    });
  },
};
