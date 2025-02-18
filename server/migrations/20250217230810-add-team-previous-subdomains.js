"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn("teams", "previousSubdomains", {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      }, { transaction });
      await queryInterface.addIndex("teams", ["previousSubdomains"], { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeIndex("teams", ["previousSubdomains"], { transaction });
      await queryInterface.removeColumn("teams", "previousSubdomains", { transaction });
    });
  },
};
