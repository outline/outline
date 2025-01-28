"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn("apiKeys", "scope", {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn("apiKeys", "scope", { transaction });
    });
  },
};
